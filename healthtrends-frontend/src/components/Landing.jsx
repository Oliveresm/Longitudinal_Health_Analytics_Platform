import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
    }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '10px' }}>🏥 HealthTrends</h1>
      <p style={{ fontSize: '1.2rem', color: '#555', marginBottom: '40px' }}>
        Plataforma Integral de Monitoreo de Salud
      </p>

      <div style={{ display: 'flex', gap: '30px' }}>
        <Link to="/auth/patient" style={{ textDecoration: 'none' }}>
          <div style={cardStyle}>
            <div style={{ fontSize: '40px' }}>👤</div>
            <h3>Soy Paciente</h3>
            <p>Consultar mis resultados</p>
          </div>
        </Link>

        <Link to="/auth/staff" style={{ textDecoration: 'none' }}>
          <div style={{ ...cardStyle, borderBottom: '4px solid #007acc' }}>
            <div style={{ fontSize: '40px' }}>👨‍⚕️</div>
            <h3>Soy Personal Médico</h3>
            <p>Doctores y Laboratorio</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

const cardStyle = {
  background: 'white',
  padding: '30px',
  borderRadius: '15px',
  width: '250px',
  textAlign: 'center',
  cursor: 'pointer',
  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
  transition: 'transform 0.2s',
  color: '#333',
  borderBottom: '4px solid #4caf50'
};