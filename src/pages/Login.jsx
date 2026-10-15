import { useState } from 'react';
import { Alert, Button, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { connexion, session, profil, estStaff, deconnexion } = useAuth();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [info, setInfo] = useState(null);
  const [form] = Form.useForm();

  const refuse = session && profil && !estStaff;

  const soumettre = async ({ email, password }) => {
    setChargement(true); setErreur(null);
    const { error } = await connexion(email.trim(), password);
    if (error) setErreur(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message);
    setChargement(false);
  };

  const oubli = async () => {
    const email = form.getFieldValue('email');
    if (!email) { setErreur('Saisissez votre email puis cliquez à nouveau sur « Mot de passe oublié ».'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
    if (error) setErreur(error.message); else setInfo('Un email de réinitialisation vous a été envoyé.');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', background: '#fff' }} className="login-grille">
      <style>{`@media (max-width: 860px){ .login-grille{ grid-template-columns: 1fr !important } .login-visuel{ display:none !important } }`}</style>
      <div className="login-visuel" style={{
        background: 'radial-gradient(circle at 30% 20%, #3a1d14 0%, #16181D 55%)', color: '#fff',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 48,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/favicon.svg" width={40} height={40} alt="" />
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', lineHeight: 1 }}>carnivore<span style={{ color: '#10B981' }}>.</span></div>
            <div style={{ color: '#10B981', fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', marginTop: 4 }}>BY CAMBÉRÈNE</div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 34, fontWeight: 750, lineHeight: 1.15, letterSpacing: '-0.02em', maxWidth: 420 }}>
            Pilotez votre restaurant en temps réel.
          </div>
          <div style={{ color: '#b3b8c2', marginTop: 14, maxWidth: 420, lineHeight: 1.6 }}>
            Commandes, cuisine, livraisons, réservations et statistiques réunies dans un seul espace.
          </div>
        </div>
        <div style={{ color: '#6b7280', fontSize: 12 }}>© {new Date().getFullYear()} Carnivore</div>
      </div>

      <div style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h1 style={{ fontSize: 26, fontWeight: 750, margin: 0, letterSpacing: '-0.02em' }}>Connexion</h1>
          <p style={{ color: '#6b7280', marginTop: 6, marginBottom: 28 }}>Espace réservé à l’équipe du restaurant.</p>

          {refuse && (
            <Alert type="warning" showIcon style={{ marginBottom: 16 }}
              title="Ce compte n’a pas accès au back-office."
              description={<>Demandez à un administrateur de vous attribuer un rôle. <a onClick={deconnexion}>Changer de compte</a></>} />
          )}
          {erreur && <Alert type="error" showIcon title={erreur} style={{ marginBottom: 16 }} />}
          {info && <Alert type="success" showIcon title={info} style={{ marginBottom: 16 }} />}

          <Form form={form} layout="vertical" onFinish={soumettre} requiredMark={false} size="large">
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Email invalide' }]}>
              <Input prefix={<MailOutlined />} placeholder="vous@carnivore.tg" autoComplete="email" />
            </Form.Item>
            <Form.Item name="password" label="Mot de passe" rules={[{ required: true, message: 'Mot de passe requis' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={chargement}>Se connecter</Button>
            <Button type="link" block onClick={oubli} style={{ marginTop: 8 }}>Mot de passe oublié ?</Button>
          </Form>
        </div>
      </div>
    </div>
  );
}
