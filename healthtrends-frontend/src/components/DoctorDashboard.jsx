import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PatientSearchDoctor from './PatientSearchDoctor'; 

// URL del ALB
const READ_URL = 'http://healthtrends-alb-246115487.us-east-1.elb.amazonaws.com';

export default function DoctorDashboard() {
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [availableTests, setAvailableTests] = useState([]);
    const [selectedTest, setSelectedTest] = useState(""); 
    const [history, setHistory] = useState([]);
    
    // ✅ 1. Nuevos estados para fechas
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Cargar exámenes cuando cambia el paciente
    useEffect(() => {
        if (!selectedPatientId) {
            setAvailableTests([]);
            setHistory([]);
            setSelectedTest("");
            return;
        }

        const loadPatientTests = async () => {
            try {
                const session = await fetchAuthSession();
                const token = session.tokens.idToken.toString();
                
                const res = await axios.get(`${READ_URL}/trends/patient/${selectedPatientId}/available_tests`, {
                    headers: { 'Authorization': token }
                });
                
                setAvailableTests(res.data);
                
                if (res.data.length > 0) {
                    setSelectedTest(res.data[0].test_code);
                } else {
                    setSelectedTest("");
                    setHistory([]);
                }
            } catch (err) { console.error(err); }
        };
        loadPatientTests();
    }, [selectedPatientId]);

    // ✅ 2. Cargar gráfica (Ahora depende también de startDate y endDate)
    useEffect(() => {
        if (!selectedPatientId || !selectedTest) return;
        
        const loadHistory = async () => {
            try {
                const session = await fetchAuthSession();
                const token = session.tokens.idToken.toString();

                // Preparamos los parámetros
                const params = {};
                if (startDate) params.start_date = startDate;
                if (endDate) params.end_date = endDate;

                const res = await axios.get(`${READ_URL}/trends/patient/${selectedPatientId}/trends/${selectedTest}`, {
                    headers: { 'Authorization': token },
                    params: params // Axios se encarga de armar ?start_date=...
                });
                
                setHistory(res.data.history || []);
            } catch (err) { console.error(err); }
        };
        loadHistory();
    }, [selectedPatientId, selectedTest, startDate, endDate]); // Se actualiza si cambian fechas

    return (
        <div style={{ padding: '20px' }}>
            <h2>👨‍⚕️ Portal Médico (Integrado)</h2>
            
            {/* Barra de Herramientas */}
            <div style={{ 
                marginBottom: '20px', 
                display: 'flex', 
                flexWrap: 'wrap', 
                gap: '20px', 
                background: '#f0f8ff', 
                padding: '20px', 
                borderRadius: '8px', 
                alignItems: 'flex-start' 
            }}>
                
                {/* 1. Seleccionar Paciente */}
                <div style={{ flex: 1, minWidth: '250px' }}>
                    <label style={{display:'block', fontWeight:'bold', marginBottom: '8px', color: '#333', fontSize:'0.9em'}}>
                        1. Seleccionar Paciente:
                    </label>
                    <PatientSearchDoctor onSelect={setSelectedPatientId} selectedId={selectedPatientId} />
                    {selectedPatientId && <small style={{color:'#28a745', marginTop:'4px', display:'block'}}>✓ Paciente seleccionado</small>}
                </div>

                {/* 2. Seleccionar Examen */}
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{display:'block', fontWeight:'bold', marginBottom: '8px', color: '#333', fontSize:'0.9em'}}>
                        2. Ver Resultados de:
                    </label>
                    {availableTests.length > 0 ? (
                        <select 
                            onChange={(e) => setSelectedTest(e.target.value)} 
                            value={selectedTest} 
                            style={{
                                width: '100%', 
                                padding: '0 12px', 
                                border: '1px solid #ced4da', 
                                borderRadius: '4px',
                                height: '38px',
                                fontSize: '1em',
                                outline: 'none',
                                cursor: 'pointer',
                                backgroundColor: 'white'
                            }}
                        >
                            {availableTests.map(t => (
                                <option key={t.test_code} value={t.test_code}>{t.test_name}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{
                            padding: '0 12px', 
                            background: '#e9ecef', 
                            borderRadius: '4px', 
                            color: '#6c757d', 
                            fontStyle: 'italic',
                            height: '38px', 
                            display: 'flex',
                            alignItems: 'center',
                            border: '1px solid #e9ecef'
                        }}>
                            {selectedPatientId ? "Sin exámenes" : "Esperando..."}
                        </div>
                    )}
                </div>

                {/* ✅ 3. Filtros de Fecha */}
                <div style={{ flex: 1, minWidth: '250px', display: 'flex', gap: '10px' }}>
                    <div style={{flex: 1}}>
                        <label style={{display:'block', fontWeight:'bold', marginBottom: '8px', color: '#333', fontSize:'0.9em'}}>
                            Desde:
                        </label>
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '0 10px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{flex: 1}}>
                        <label style={{display:'block', fontWeight:'bold', marginBottom: '8px', color: '#333', fontSize:'0.9em'}}>
                            Hasta:
                        </label>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={{
                                width: '100%',
                                height: '38px',
                                padding: '0 10px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                outline: 'none'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Gráfica */}
            {history.length > 0 ? (
                <div style={{ width: '100%', height: 400, background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <ResponsiveContainer>
                        <LineChart data={history}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                            <XAxis 
                                dataKey="test_date" 
                                stroke="#666" 
                                tick={{fontSize: 12}} 
                                tickFormatter={(date) => new Date(date).toLocaleDateString()} // Formato de fecha legible
                            />
                            <YAxis stroke="#666" tick={{fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)'}}
                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                            />
                            <Legend wrapperStyle={{paddingTop: '20px'}} />
                            <Line type="monotone" dataKey="value" stroke="#007acc" name="Valor Medido" strokeWidth={3} activeDot={{r:6}} />
                            <Line type="monotone" dataKey="moving_avg_3_points" stroke="#ff7300" name="Promedio Móvil (Tendencia)" strokeDasharray="5 5" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : selectedPatientId && selectedTest ? (
                <div style={{padding: '40px', textAlign: 'center', color: '#666', background: '#f9f9f9', borderRadius: '8px'}}>
                    {startDate || endDate 
                        ? "No hay datos en el rango de fechas seleccionado." 
                        : "No hay datos históricos suficientes para graficar este examen."}
                </div>
            ) : null}
        </div>
    );
}   