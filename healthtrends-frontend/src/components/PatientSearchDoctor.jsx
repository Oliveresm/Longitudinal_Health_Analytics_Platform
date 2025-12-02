import { useState, useEffect } from 'react';
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

// ✅ SEGURIDAD: Leemos la URL desde las variables de entorno (.env)
const READ_URL = import.meta.env.VITE_READ_URL;

export default function PatientSearchDoctor({ onSelect, selectedId }) {
    const [query, setQuery] = useState("");
    const [patients, setPatients] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchField, setSearchField] = useState("name"); 

    // Cargar pacientes al montar
    useEffect(() => {
        const loadPatients = async () => {
            try {
                const session = await fetchAuthSession();
                const token = session.tokens.idToken.toString();
                
                // console.log("📡 Solicitando pacientes...");
                const response = await axios.get(`${READ_URL}/patients`, {
                    headers: { 'Authorization': token }
                });

                // 🔍 LOGS PARA DIAGNÓSTICO (Opcional: puedes comentarlos si ya funciona bien)
                // console.log("📦 RESPUESTA COMPLETA:", response);
                
                const rawData = response.data;
                let finalData = [];

                // Intentamos detectar dónde está la lista
                if (Array.isArray(rawData)) {
                    // console.log("✅ Formato detectado: Array directo");
                    finalData = rawData;
                } else if (rawData && Array.isArray(rawData.data)) {
                    // console.log("✅ Formato detectado: Propiedad .data");
                    finalData = rawData.data;
                } else if (rawData && Array.isArray(rawData.results)) {
                    // console.log("✅ Formato detectado: Propiedad .results");
                    finalData = rawData.results;
                } else if (rawData && Array.isArray(rawData.patients)) {
                    // console.log("✅ Formato detectado: Propiedad .patients");
                    finalData = rawData.patients;
                } else {
                    console.warn("⚠️ NO SE ENCONTRÓ UN ARRAY. Estructura recibida:", rawData);
                    finalData = [];
                }

                setPatients(finalData);
                setLoading(false);
            } catch (err) { 
                console.error("❌ Error cargando pacientes:", err); 
                setPatients([]); 
                setLoading(false); 
            }
        };
        loadPatients();
    }, []);

    // Sincronizar texto si cambia el ID seleccionado externamente
    useEffect(() => {
        if (selectedId && patients.length > 0) {
            const current = patients.find(p => p.id === selectedId);
            if (current && current.name !== query) {
                setQuery(current.name);
            }
        }
    }, [selectedId, patients]);

    // Lógica de filtrado
    useEffect(() => {
        if (!query) {
            setFiltered([]);
            return;
        }
        // Protección extra
        const safePatients = Array.isArray(patients) ? patients : [];
        const lowerQ = query.toLowerCase();
        
        const results = safePatients.filter(p => {
            const searchTarget = (searchField === 'id') ? p.id : p.name;
            return searchTarget && searchTarget.toString().toLowerCase().includes(lowerQ);
        });
        setFiltered(results);
    }, [query, patients, searchField]);

    const handleSelect = (patient) => {
        setQuery(patient.name);
        setShowDropdown(false);
        onSelect(patient.id);
    };

    const heightStyle = '38px';
    const borderStyle = '1px solid #ced4da';

    return (
        <div style={{ position: 'relative', width: '100%', minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <select 
                    value={searchField}
                    onChange={e => setSearchField(e.target.value)}
                    style={{ 
                        height: heightStyle, padding: '0 10px', border: borderStyle, borderRight: 'none', 
                        borderRadius: '4px 0 0 4px', backgroundColor: '#f8f9fa', cursor: 'pointer', fontSize: '0.9em',
                        width: 'auto', maxWidth: '85px', outline: 'none', color: '#495057'
                    }}
                >
                    <option value="name">Nom</option>
                    <option value="email">@</option>
                    <option value="id">ID</option>
                </select>
                <input 
                    placeholder={loading ? "Cargando..." : "Buscar paciente..."}
                    value={query}
                    onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
                    onFocus={() => setShowDropdown(true)}
                    style={{ 
                        flex: 1, height: heightStyle, padding: '0 12px', border: borderStyle, 
                        borderRadius: '0 4px 4px 0', outline: 'none', fontSize: '1em'
                    }}
                    disabled={loading}
                />
            </div>
            
            {/* Lista desplegable */}
            {showDropdown && filtered.length > 0 && (
                <ul style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, background: 'white', border: '1px solid #ccc', 
                    listStyle: 'none', padding: 0, margin: '2px 0 0 0', zIndex: 1000, maxHeight: '250px', overflowY: 'auto', 
                    boxShadow: '0 4px 10px rgba(0,0,0,0.1)', borderRadius: '4px'
                }}>
                    {filtered.map((p) => (
                        <li 
                            key={p.id} 
                            onClick={() => handleSelect(p)}
                            style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f1f1f1', fontSize: '0.95em' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                        >
                            <div style={{fontWeight: 'bold', color: '#333'}}>{p.name}</div>
                            {p.email && <div style={{fontSize:'0.85em', color:'#6c757d'}}>{p.email}</div>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}