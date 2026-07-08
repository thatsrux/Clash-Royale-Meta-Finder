import { PlayerProfile } from '../../types/clashRoyale';
import { Trophy, Shield } from 'lucide-react';

interface Props {
  profile: PlayerProfile;
  collectionLevel: number;
}

export const PlayerProfileHeader = ({ profile, collectionLevel }: Props) => {
  return (
    <div className="profile-header">
      <div>
        <h2 className="profile-name">{profile.name}</h2>
        <span className="profile-tag">{profile.tag}</span>
      </div>
      <div className="profile-stats">
        <div className="stat-badge">
          <Trophy color="var(--secondary)" size={24} />
          <div className="stat-values">
            <div className="stat-main">{profile.trophies}</div>
            <div className="stat-label">TROPHIES</div>
          </div>
        </div>
        <div className="stat-badge">
          <Shield color="var(--primary)" size={24} />
          <div className="stat-values">
            <div className="stat-main">{collectionLevel}</div>
            <div className="stat-label">COLLECTION</div>
          </div>
        </div>
      </div>
    </div>
  );
};
