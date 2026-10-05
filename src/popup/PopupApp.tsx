import React from 'react';
import { Camera, ExternalLink, CheckCircle, Loader2, BookOpen, Users } from 'lucide-react';
import { crmStorage } from '../storage/crmStorage';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import type { ParsedInstagramProfile } from '../models/influencer';

export const PopupApp: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [profile, setProfile] = React.useState<ParsedInstagramProfile | null>(null);
  const [isSaved, setIsSaved] = React.useState(false);
  const [metrics, setMetrics] = React.useState({ total: 0 });

  React.useEffect(() => {
    async function init() {
      try {
        const m = await crmStorage.getMetrics();
        setMetrics(m);

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          const tab = tabs[0];
          if (tab?.id && tab.url?.includes('instagram.com/')) {
            try {
              const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PROFILE_DATA' });
              if (response?.profile?.username) {
                setProfile(response.profile);
                const normalized = response.profile.username.replace(/^@/, '').toLowerCase().trim();
                const existing = await crmStorage.findByUsername(normalized);
                setIsSaved(!!existing);
              }
            } catch (err) {
              console.log('Content script not available:', err);
            }
            setLoading(false);
          } else {
            setLoading(false);
          }
        });
      } catch {
        setLoading(false);
      }
    }
    init();
  }, []);

  const openDashboard = () => chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' });

  return (
    <div style={{ width: 320, background: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ padding: '16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={16} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', lineHeight: 1 }}>CreatorVault</div>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginTop: 2 }}>CRM</div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', background: '#f3f4f6', padding: '4px 8px', borderRadius: 12 }}>
          {metrics.total} {metrics.total === 1 ? 'Creator' : 'Creators'}
        </div>
      </header>

      <main style={{ padding: '24px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}><Loader2 className="animate-spin" color="#4f46e5" /></div>
        ) : profile ? (
          <div className="animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#059669', background: '#d1fae5', padding: '4px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
              <CheckCircle size={14} /> Creator detected
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Avatar name={profile.displayName || profile.username!} imageUrl={profile.profileImage} size={64} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginTop: 12 }}>{profile.displayName || profile.username}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{profile.followers || '?'} followers</div>
            
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!isSaved ? (
                <Button fullWidth onClick={() => {
                  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_CRM_PANEL' });
                    window.close();
                  });
                }} style={{ background: '#4f46e5' }}>Add to CRM</Button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#059669', fontSize: 14, fontWeight: 500, padding: 10 }}>
                  <CheckCircle size={16} /> Saved to CRM
                </div>
              )}
              <Button fullWidth variant="secondary" onClick={openDashboard}>Open Dashboard</Button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in" style={{ textAlign: 'center', color: '#6b7280' }}>
            <Camera size={32} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 8 }}>Open an Instagram creator profile to start.</div>
            <p style={{ fontSize: 13, marginBottom: 20 }}>Capture creators directly into your local database.</p>
            <Button fullWidth onClick={() => window.open('https://instagram.com')} style={{ background: '#4f46e5' }}>Open Instagram</Button>
            <Button fullWidth variant="ghost" onClick={openDashboard} style={{ marginTop: 8 }}>Open Dashboard</Button>
          </div>
        )}
      </main>
    </div>
  );
};
