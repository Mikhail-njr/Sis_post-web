(async () => {
  try {
    const res = await fetch('http://localhost:3000/api/productos');
    console.log('status', res.status);
    const text = await res.text();
    console.log('bodyStart:', text.slice(0,200));
  } catch (e) {
    console.error('error', e.message);
  }
})();