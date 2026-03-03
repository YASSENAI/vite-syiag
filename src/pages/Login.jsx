import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Droplet, Lock, User } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const { login } = useApp();
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        const success = login(username, pin);
        if (success) {
            navigate('/');
        } else {
            setError('اسم المستخدم أو الرقم السري غير صحيح');
        }
    };

    return (
        <div className="flex-center" style={{ minHeight: '100vh', padding: '1rem' }}>
            <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div className="flex-center" style={{
                        width: '64px', height: '64px',
                        borderRadius: '50%', background: 'var(--accent-gold)',
                        margin: '0 auto 1.5rem', border: '1px solid var(--border-highlight)'
                    }}>
                        <Droplet size={32} className="text-gold" />
                    </div>
                    <h2 className="text-gold" style={{ marginBottom: '0.5rem' }}>سياج للعطور</h2>
                    <p className="text-muted">قم بتسجيل الدخول للوصول إلى النظام</p>
                </div>

                {error && (
                    <div className="glass-card" style={{ padding: '0.75rem 1rem', marginBottom: '1.5rem', borderColor: 'var(--danger)', background: 'rgba(255, 59, 48, 0.1)' }}>
                        <p className="text-danger" style={{ fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label className="form-label">اسم المستخدم</label>
                        <div style={{ position: 'relative' }}>
                            <User size={20} className="text-muted" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingRight: '3rem', paddingLeft: '1rem' }}
                                placeholder="معرف المدير أو الموظف"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <label className="form-label">الرقم السري</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} className="text-muted" style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="password"
                                className="form-input"
                                style={{ paddingRight: '3rem', paddingLeft: '1rem' }}
                                placeholder="أدخل 4 أرقام"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '1rem' }}>
                        تسجيل الدخول للنظام
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                        <span style={{ display: 'block', marginBottom: '0.25rem' }}>حسابات تجريبية:</span>
                        المدير: <strong>admin</strong> / <strong>0000</strong><br />
                        موظف مبيعات: <strong>emp1</strong> / <strong>1111</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
