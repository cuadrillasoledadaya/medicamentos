// Loading screen shown while lazy routes are being fetched.

export function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666',
      }}
    >
      Cargando...
    </div>
  );
}
