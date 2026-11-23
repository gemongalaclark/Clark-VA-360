/* Messenger / Viber / Call with the car already in the message. On a phone this
   bar sticks to the bottom of the screen. Every button gives feedback, even on a
   laptop with no Viber or phone app: the number shows in a toast with Copy. */
import { MessageCircle, MessagesSquare, Phone } from 'lucide-react';
import styles from '../Showroom360.module.css';
import { useShowroom } from '../store.js';
import { t } from '../i18n.js';
import { useNav, useToast, copyText } from '../ui.jsx';
import { inquiryText, messengerUrl, viberUrl } from '../showroomRules.js';
import { telHref } from './Home.jsx';

/* `disabled`: a reserved car takes no more inquiries */
export default function InquiryBar({ car, info, disabled = false }) {
  const { settings } = useShowroom();
  const { lang } = useNav();
  const toast = useToast();
  const text = inquiryText(car, info, lang);

  const offerNumber = (number) => toast(t(lang, 'inq.number', { n: number }), {
    label: t(lang, 'inq.copy'),
    onClick: async () => { if (await copyText(number)) toast(t(lang, 'inq.copiedNumber')); },
  });

  const onMessenger = async () => {
    const url = messengerUrl(settings.messenger);
    if (!url) { toast(t(lang, 'inq.notSet')); return; }
    const copied = copyText(text);           /* start while the page still has focus */
    window.open(url, '_blank', 'noopener');
    if (await copied) toast(t(lang, 'inq.copied'));
  };

  const onViber = () => {
    if (!settings.viber) { toast(t(lang, 'inq.notSet')); return; }
    window.location.href = viberUrl(settings.viber, text);
    offerNumber(settings.viber);
  };

  const onCall = () => {
    if (!settings.phone) { toast(t(lang, 'inq.notSet')); return; }
    window.location.href = telHref(settings.phone);
    offerNumber(settings.phone);
  };

  return (
    <div className={styles.inquiryBar} role="group" aria-label={t(lang, 'inq.title')}>
      <button type="button" className={styles.btnPrimary} onClick={onMessenger} disabled={disabled}>
        <MessageCircle size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'inq.messenger')}
      </button>
      <button type="button" className={styles.btnGhost} onClick={onViber} disabled={disabled}>
        <MessagesSquare size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'inq.viber')}
      </button>
      <button type="button" className={styles.btnGhost} onClick={onCall} disabled={disabled}>
        <Phone size={18} strokeWidth={1.75} aria-hidden="true" />{t(lang, 'inq.call')}
      </button>
    </div>
  );
}
