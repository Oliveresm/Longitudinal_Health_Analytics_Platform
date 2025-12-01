import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
// Importamos los componentes gráficos necesarios
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ComposedChart, Bar 
} from 'recharts';

const READ_URL = 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function PatientDashboard({ user }) {
    
    // Identificador del paciente (viene del login)
    const patientId = user.username; 

    const [availableTests, setAvailableTests] = useState([]);
    const [selectedTest, setSelectedTest] = useState("");
    const [history, setHistory] = useState([]);

    // ✅ Nuevos Estados: Fechas y Vista Mensual
    // Por defecto: Últimos 12 meses
    const [startDate, setStartDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]); 
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); 

    const [monthlyData, setMonthlyData] = useState([]);
    const [showMonthly, setShowMonthly] = useState(false);

    // 1. Cargar lista de exámenes disponibles
    useEffect(() => {
        const loadTests = async () => {
            try {
                const session = await fetchAuthSession();
                const token = session.tokens.idToken.toString();
                const res = await axios.get(`${READ_URL}/trends/patient/${patientId}/available_tests`, {
                    headers: { 'Authorization': token }
                });
                setAvailableTests(res.data);
                if (res.data.length > 0) setSelectedTest(res.data[0].test_code);
            } catch (e) { console.error(e); }
        };
        loadTests();
    }, [patientId]);

    // 2. Carga Inteligente de Datos (Smart Fetching)
    useEffect(() => {
        if (!selectedTest) return;
        
        const loadData = async () => {
            try {
                const session = await fetchAuthSession();
                const token = session.tokens.idToken.toString();

                // A. Calcular rango de días
                const start = new Date(startDate);
                const end = new Date(endDate);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                // B. Cargar detalle diario (Limitado por fechas)
                const resHistory = await axios.get(`${READ_URL}/trends/patient/${patientId}/trends/${selectedTest}`, {
                    headers: { 'Authorization': token },
                    params: { start_date: startDate, end_date: endDate }
                });
                setHistory(resHistory.data.history || []);

                // C. LÓGICA CONDICIONAL: Cargar vista mensual si es > 90 días
                if (diffDays > 90) {
                    setShowMonthly(true);
                    const resMonthly = await axios.get(`${READ_URL}/trends/patient/${patientId}/monthly-trends/${selectedTest}`, {
                        headers: { 'Authorization': token }
                    });
                    setMonthlyData(resMonthly.data.monthly_data || []);
                } else {
                    setShowMonthly(false);
                    setMonthlyData([]);
                }

            } catch (e) { console.error(e); }
        };
        loadData();
    }, [selectedTest, patientId, startDate, endDate]);

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h2>👤 Mi Expediente Digital</h2>
            <p style={{color:'#666', marginBottom: '20px'}}>Bienvenido, <strong>{patientId}</strong></p>
            
            {availableTests.length === 0 ? (
                <div style={{padding: '20px', background: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeeba', color: '#856404'}}>
                    📭 No tienes resultados de laboratorio registrados todavía.
                </div>
            ) : (
                <>
                    {/* BARRA DE FILTROS */}
                    <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '20px', background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e9ecef', alignItems: 'flex-end' }}>
                        
                        {/* Selector de Examen */}
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{display:'block', fontWeight:'bold', marginBottom:'5px', color: '#495057'}}>Ver Resultados de:</label>
                            <select 
                                value={selectedTest} 
                                onChange={e => setSelectedTest(e.target.value)} 
                                style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da'}}
                            >
                                {availableTests.map(t => (
                                    <option key={t.test_code} value={t.test_code}>
                                        {/* ✅ CORRECCIÓN: Mostramos Nombre + (Unidad) */}
                                        {t.test_name} {t.unit ? `(${t.unit})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Fechas */}
                        <div style={{ flex: 1, minWidth: '250px', display: 'flex', gap: '10px' }}>
                            <div style={{flex: 1}}>
                                <label style={{display:'block', fontWeight:'bold', marginBottom:'5px', color: '#495057'}}>Desde:</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da'}} />
                            </div>
                            <div style={{flex: 1}}>
                                <label style={{display:'block', fontWeight:'bold', marginBottom:'5px', color: '#495057'}}>Hasta:</label>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da'}} />
                            </div>
                        </div>
                    </div>

                    {/* GRÁFICA 1: DIARIA */}
                    {history.length > 0 ? (
                        <div style={{ marginBottom: '40px' }}>
                            <h3 style={{color: '#007acc', fontSize: '1.2em'}}>📈 Mi Historial Detallado</h3>
                            <div style={{ width: '100%', height: 350, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                                <ResponsiveContainer>
                                    <LineChart data={history}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="test_date" tickFormatter={(d) => new Date(d).toLocaleDateString()} />
                                        <YAxis />
                                        <Tooltip labelFormatter={(l) => new Date(l).toLocaleString()} />
                                        <Legend />
                                        <Line type="monotone" dataKey="value" stroke="#28a745" name="Mi Resultado" strokeWidth={3} dot={{r: 4}} />
                                        <Line type="monotone" dataKey="moving_avg_3_points" stroke="#ffc107" name="Tendencia" dot={false} strokeDasharray="5 5" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ) : <div style={{padding:'20px', textAlign:'center', color:'#666'}}>No hay datos para el rango seleccionado.</div>}

                    {/* GRÁFICA 2: MENSUAL (Si aplica) */}
                    {showMonthly && monthlyData.length > 0 && (
                        <div style={{ marginTop: '20px', borderTop: '2px dashed #eee', paddingTop: '20px' }}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <h3 style={{color: '#28a745', fontSize: '1.2em'}}>📊 Mis Promedios Mensuales</h3>
                                <span style={{background: '#d4edda', color: '#155724', padding: '4px 10px', borderRadius: '15px', fontSize: '0.75em'}}>
                                    Vista Largo Plazo
                                </span>
                            </div>
                            <div style={{ width: '100%', height: 350, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
                                <ResponsiveContainer>
                                    <ComposedChart data={monthlyData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="date" tickFormatter={(d) => new Date(d).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })} />
                                        <YAxis />
                                        <Tooltip labelFormatter={(l) => new Date(l).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })} />
                                        <Legend />
                                        <Bar dataKey="max" fill="#e9ecef" name="Rango Máx" barSize={30} />
                                        <Line type="monotone" dataKey="average" stroke="#20c997" strokeWidth={3} name="Promedio" dot={{r:4}} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}