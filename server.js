const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();

const cookieParser = require('cookie-parser');
const { gerarComGemini } = require('./gemini-manager');
const {
  createUser,
  getUserByEmail,
  getUserById,
  applyInviteBonusIfNeeded,
  invitesRequiredForNextTier,
  countSignupsByIp,
} = require('./db');
const { signUserToken, requireAuth, hashPassword, comparePassword } = require('./auth');

const app = express();
const PORT = process.env.PORT || 10000;

const keys = [];
for (let i = 1; i <= 10; i++) {
  const key = process.env[`GEMINI_API_KEY_${i}`];
  if (key) keys.push(key);
}

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    credits: user.credits,
    unlimited: !!user.unlimited_credits,
    referralCode: user.referral_code,
  };
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', keysLoaded: keys.length });
});

app.post('/api/auth/signup', (req, res) => {
  const { email, password, name, referralCode } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  if (getUserByEmail(email)) return res.status(409).json({ error: 'Email já cadastrado' });

  const ip = clientIp(req);
  const user = createUser({
    email,
    passwordHash: hashPassword(password),
    name,
    referredByCode: referralCode,
    signupIp: ip,
  });

  if (user.referred_by) applyInviteBonusIfNeeded(user.id);

  const token = signUserToken(user);
  res.cookie('oficina_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });

  res.json({
    user: publicUser(user),
    ipSignupWarning: countSignupsByIp(ip) >= 3 ? 'Várias contas criadas a partir deste IP' : null,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = getUserByEmail(email);
  if (!user || !user.password_hash || !comparePassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ou senha inválidos' });
  }
  const token = signUserToken(user);
  res.cookie('oficina_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 });
  res.json({ user: publicUser(user) });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('oficina_token');
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  res.json({ user: publicUser(user), nextTier: invitesRequiredForNextTier(user) });
});

app.post('/generate', async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt não fornecido' });
    }
    const resultado = await gerarComGemini(prompt, history || []);
    res.json({ code: resultado });
  } catch (error) {
    console.error('Erro na geração:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar requisição com IA' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`   Chaves carregadas: ${keys.length}`);
  console.log(`Servidor rodando com sucesso!`);
});
