import { useState, useEffect } from 'react';

/* Round avatar: the profile picture when there is one, otherwise the initials.
   Renders the caller's own avatar element (so its size/gradient/tooltip styles keep working)
   and fills it with the picture. Extra props (e.g. data-tip) pass through to that element. */
export default function Avatar({ profile, className = '', ...rest }) {
  const [broken, setBroken] = useState(false);
  const url = profile?.avatar_url;
  useEffect(() => { setBroken(false); }, [url]);

  const initials = profile ? `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() : '?';
  const showImg = !!url && !broken;

  return (
    <div className={className} {...rest} style={showImg ? { overflow: 'hidden', padding: 0, ...rest.style } : rest.style}>
      {showImg
        ? <img src={url} alt="" onError={() => setBroken(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }} />
        : initials}
    </div>
  );
}
