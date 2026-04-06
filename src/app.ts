import app from './server';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.listen(PORT, () => {
  console.log(`NyxScribe server running on port ${PORT}`);
});
