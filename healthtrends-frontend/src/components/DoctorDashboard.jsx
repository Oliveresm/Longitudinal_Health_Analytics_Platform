import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
// Importamos todos los componentes gráficos necesarios
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Bar 
} from 'recharts';
import PatientSearchDoctor from './PatientSearchDoctor'; 

const READ_URL = import.meta.env.VITE_READ_URL;

export default function DoctorDashboard() {
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [availableTests, setAvailableTests] = useState([]);
    const [selectedTest, setSelectedTest] = useState(""); 
    const [history, setHistory] = useState([]);
    
    // Fechas por defecto: Últimos 12 meses
    const [startDate, setStartDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]); 
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); 

    // Estados para la Vista Materializada
    const [monthlyData, setMonthlyData] = useState([]);
    const [showMonthly, setShowMonthly] = useState(false); 

    // ✅ 1. NUEVO ESTADO: Alerta Predictiva
    const [riskAlert, setRiskAlert] = useState(null); 

    // 1. Cargar lista de exámenes del paciente
    useEffect(() => {
        if (!selectedPatientId) { setAvailableTests([]); return; }
        const loadTests = async () => {
            try {
                const session = await fetchAuthSession();
                const token = session.tokens.idToken.toString();
                const res = await axios.get(`${READ_URL}/trends/patient/${selectedPatientId}/available_tests`, { headers: { 'Authorization': token } });
                setAvailableTests(res.data);
                
                // Lógica para mantener o seleccionar el test por defecto
                if (res.data.length > 0) {
                    const currentTestStillAvailable = res.data.find(t => t.test_code === selectedTest);
                    if (!selectedTest || !currentTestStillAvailable) {
                        setSelectedTest(res.data[0].test_code);
                    }
                }
            } catch (err) { console.error(err); }
        };
        loadTests();
    }, [selectedPatientId]);

    // 2. Carga Inteligente de Datos (Smart Fetching)
    useEffect(() => {
        if (!selectedPatientId || !selectedTest) {
            setHistory([]);
            setMonthlyData([]);
            setRiskAlert(null); // Limpiar alerta
            return;
        }
        
        const loadSmartData = async () => {
            try {
                const session = await fetchAuthSession();
                const token = session.tokens.idToken.toString();

                // A. Calcular rango de días seleccionado
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                // B. Siempre cargamos el detalle diario (Limitado por fechas)
                const resHistory = await axios.get(`${READ_URL}/trends/patient/${selectedPatientId}/trends/${selectedTest}`, {
                    headers: { 'Authorization': token },
                    params: { start_date: startDate, end_date: endDate }
                });
                setHistory(resHistory.data.history || []);

                // C. LÓGICA CONDICIONAL: Solo cargar vista mensual si es > 90 días
                if (diffDays > 90) {
                    setShowMonthly(true);
                    const resMonthly = await axios.get(`${READ_URL}/trends/patient/${selectedPatientId}/monthly-trends/${selectedTest}`, {
                        headers: { 'Authorization': token }
                    });
                    setMonthlyData(resMonthly.data.monthly_data || []);
                } else {
                    setShowMonthly(false); 
                    setMonthlyData([]); 
                }

                // ✅ D. NUEVO: Cargar Análisis de Riesgo
                // Se ejecuta siempre para mostrar la alerta si es necesario
                try {
                    const resRisk = await axios.get(`${READ_URL}/trends/patient/${selectedPatientId}/risk-analysis/${selectedTest}`, {
                        headers: { 'Authorization': token }
                    });
                    setRiskAlert(resRisk.data);
                } catch (error) {
                    console.error("Error cargando riesgo:", error);
                    setRiskAlert(null);
                }

            } catch (err) { console.error(err); }
        };
        loadSmartData();
    }, [selectedPatientId, selectedTest, startDate, endDate]);

    // ✅ 2. Componente interno para mostrar la Alerta
    const AlertDisplay = () => {
        if (!riskAlert || riskAlert.alert_level === 'none' || riskAlert.trend === 'insufficient_data') return null;

        const level = riskAlert.alert_level;
        const style = {
            padding: '15px',
            borderRadius: '8px',
            fontWeight: 'bold',
            marginBottom: '20px',
            borderLeft: '5px solid',
            // Estilos base
        };

        let icon = '';
        if (level === 'CRITICAL') {
            style.backgroundColor = '#f8d7da'; // Rojo claro
            style.color = '#721c24'; // Rojo oscuro
            style.borderColor = '#f5c6cb'; 
            icon = '🚨 URGENTE: ';
        } else if (level === 'WARNING') {
            style.backgroundColor = '#fff3cd'; // Amarillo claro
            style.color = '#856404'; // Amarillo oscuro
            style.borderColor = '#ffeeba'; 
            icon = '🟡 ALERTA DE TENDENCIA: ';
        } else if (level === 'INFO') {
            style.backgroundColor = '#d1ecf1'; // Azul claro
            style.color = '#0c5460'; // Azul oscuro
            style.borderColor = '#bee5eb'; 
            icon = 'ℹ️ ';
        }

        return (
            <div style={style}>
                {icon}
                {riskAlert.alert_message}
                {riskAlert.change_percent && riskAlert.trend !== 'stable' && ` (Cambio promedio: ${riskAlert.change_percent}%)`}
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', maxWidth:'1200px', margin:'0 auto', fontFamily:'sans-serif' }}>
            <h2>👨‍⚕️ Portal Médico (Smart Analytics)</h2>
            
            {/* BARRA SUPERIOR DE FILTROS */}
            <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', background: '#f0f8ff', padding: '20px', borderRadius: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Paciente:</label>
                    <PatientSearchDoctor onSelect={setSelectedPatientId} selectedId={selectedPatientId} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Examen:</label>
                    <select 
                        onChange={(e) => setSelectedTest(e.target.value)} 
                        value={selectedTest} 
                        style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}}
                    >
                        {availableTests.map(t => (
                            <option key={t.test_code} value={t.test_code}>
                                {t.test_name} {t.unit ? `(${t.unit})` : ''}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: 1, minWidth: '250px', display: 'flex', gap: '10px' }}>
                    <div style={{flex: 1}}>
                        <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Desde:</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}} />
                    </div>
                    <div style={{flex: 1}}>
                        <label style={{display:'block', fontWeight:'bold', marginBottom:'5px'}}>Hasta:</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc'}} />
                    </div>
                </div>
            </div>

            {/* ✅ ZONA DE ALERTA: Aquí se muestra la caja roja/amarilla */}
            <AlertDisplay />

            {/* GRÁFICA 1: DETALLE DIARIO (Siempre visible) */}
            {history.length > 0 ? (
                <div style={{ marginBottom: '40px' }}>
                    <h3 style={{color: '#007acc'}}>📈 Detalle Diario ({history.length} registros)</h3>
                    <div style={{ width: '100%', height: 350, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <ResponsiveContainer>
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="test_date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
                                <YAxis />
                                <Tooltip labelFormatter={(l) => new Date(l).toLocaleString()} />
                                <Legend />
                                <Line type="monotone" dataKey="value" stroke="#007acc" name="Valor" dot={false} strokeWidth={2} />
                                <Line type="monotone" dataKey="moving_avg_3_points" stroke="#ff7300" name="Tendencia" dot={false} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : <div style={{padding:'20px', textAlign:'center', color:'#666'}}>No hay datos para el rango seleccionado.</div>}

            {/* GRÁFICA 2: TENDENCIA MENSUAL (Solo si > 90 días) */}
            {showMonthly && monthlyData.length > 0 && (
                <div style={{ marginTop: '20px', borderTop: '2px dashed #eee', paddingTop: '20px' }}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <h3 style={{color: '#28a745'}}>📊 Resumen Mensual (Largo Plazo)</h3>
                        <span style={{background: '#d4edda', color: '#155724', padding: '5px 10px', borderRadius: '20px', fontSize: '0.8em'}}>
                            🚀 Optimizado con Vista Materializada
                        </span>
                    </div>
                    <p style={{fontSize: '0.9em', color: '#666'}}>
                        Mostrando promedios mensuales porque el rango seleccionado es amplio.
                    </p>
                    <div style={{ width: '100%', height: 350, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                        <ResponsiveContainer>
                            <ComposedChart data={monthlyData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })} />
                                <YAxis />
                                <Tooltip labelFormatter={(l) => new Date(l).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} />
                                <Legend />
                                <Bar dataKey="max" fill="#e9ecef" name="Max" barSize={30} />
                                <Line type="monotone" dataKey="average" stroke="#28a745" strokeWidth={3} name="Promedio" dot={{r:4}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </div>
    );
}