require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

// Cadastro dos clientes
// Cada cliente tem um ID único que vai na URL: /callback?client=joao
const clients = {
  joao: {
    clientId: process.env.JOAO_CLIENT_ID,
    clientSecret: process.env.JOAO_CLIENT_SECRET,
    botToken: process.env.JOAO_BOT_TOKEN,
    guildId: process.env.JOAO_GUILD_ID,
    roleId: process.env.JOAO_ROLE_ID,
  },
};

app.get('/callback', async (req, res) => {
  const { code, client: clientKey } = req.query;

  if (!code || !clientKey) return res.send('❌ Requisição inválida.');

  const cfg = clients[clientKey];
  if (!cfg) return res.send('❌ Cliente não encontrado.');

  const redirectUri = `${process.env.BASE_URL}/callback?client=${clientKey}`;

  try {
    // Troca code por access token
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    // Pega dados do usuário
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userId = userRes.data.id;

    // Adiciona no servidor
    await axios.put(
      `https://discord.com/api/guilds/${cfg.guildId}/members/${userId}`,
      { access_token: accessToken },
      { headers: { Authorization: `Bot ${cfg.botToken}` } }
    );

    // Adiciona o cargo
    setTimeout(async () => {
      try {
        await axios.put(
          `https://discord.com/api/guilds/${cfg.guildId}/members/${userId}/roles/${cfg.roleId}`,
          {},
          { headers: { Authorization: `Bot ${cfg.botToken}` } }
        );
        console.log(`✅ Cargo liberado para ${userRes.data.username} (cliente: ${clientKey})`);
      } catch (e) {
        console.error('Erro ao adicionar cargo:', e.response?.data || e.message);
      }
    }, 2000);

    res.send(`
      <html>
        <head><title>Verificado!</title></head>
        <body style="background:#23272a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:10px;">
          <h1>✅ Verificado com sucesso!</h1>
          <p>Pode voltar ao servidor, seu acesso foi liberado.</p>
        </body>
      </html>
    `);

  } catch (err) {
    console.error('Erro no callback:', err.response?.data || err.message);
    res.send('❌ Erro na verificação. Tente novamente.');
  }
});

app.get('/', (req, res) => res.send('✅ Auth site online.'));

app.listen(process.env.PORT || 3000, () => {
  console.log(`🌐 Site rodando na porta ${process.env.PORT || 3000}`);
});