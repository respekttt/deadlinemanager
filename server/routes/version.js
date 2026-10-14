export default async function versionRoutes(app, { version }) {
  app.get('/version', async () => ({ version }));
}
