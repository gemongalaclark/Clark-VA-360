import { useState } from 'react';

/* Round avatar: the profile picture when there is one, otherwise gradient initials.
   `className` supplies the size/typography (callers already style their own avatar circle). */
export default function Avatar({ profile, className = '' }) {
  const [broken, setBroken] = useState(false);
  const initials = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : '?';

  if (profile?.avatar_url && !broken) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        className={className}
        style={{ objectFit: 'cover', background: '#e9ecef' }}
        onError={() => setBroken(true)}
      />
    );
  }
  return <div className={className}>{initials}</div>;
}
