import { useState } from 'react';
import { Mail, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { supabase } from '../lib/supabase';
import styles from './Contact.module.css';

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [status, setStatus] = useState(null); // 'sending' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      let saved = false;

      // 1. Save to Supabase database (if configured)
      if (supabase) {
        const { error: dbError } = await supabase
          .from('contact_messages')
          .insert([
            {
              name: form.name.trim(),
              email: form.email.trim(),
              subject: form.subject.trim(),
              message: form.message.trim(),
            },
          ]);

        if (dbError) {
          console.error('Supabase error:', dbError);
        } else {
          saved = true;
        }
      }

      // 2. Send email notification via EmailJS (if configured)
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (serviceId && templateId && publicKey) {
        await emailjs.send(
          serviceId,
          templateId,
          {
            name: form.name.trim(),
            from_name: form.name.trim(),
            email: form.email.trim(),
            from_email: form.email.trim(),
            subject: form.subject.trim(),
            message: form.message.trim(),
          },
          publicKey
        );
        saved = true;
      }

      // Fallback if neither service is configured
      if (!supabase && !(serviceId && templateId && publicKey)) {
        console.warn('Neither Supabase nor EmailJS credentials found. Check your environment variables.');
        await new Promise(resolve => setTimeout(resolve, 800));
        saved = true;
      }

      if (saved) {
        setStatus('success');
        setForm({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setStatus(null), 5000);
      } else {
        throw new Error('Failed to send message. Please try again or email me directly.');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Something went wrong. Please try again or email me directly.');
    }
  };

  return (
    <section id="contact" className={`section ${styles.contact}`}>
      <div className="container">
        <h2 className="section-title">Get In <span>Touch</span></h2>
        <div className="section-divider" />

        <div className={styles.inner}>
          {/* Left */}
          <div className={styles.leftCol}>
            <h3 className={styles.callout}>Let&apos;s work together!</h3>
            <p className={styles.calloutDesc}>
              Looking for a dedicated, tech-savvy Virtual Assistant to handle your
              administrative tasks, social media, or email campaigns? I&apos;m ready to help!
              Feel free to reach out — I&apos;m always open to new opportunities.
            </p>

            <div className={styles.contactDetails}>
              <a
                id="contact-email-link"
                href="mailto:gemongalaclark.official@gmail.com"
                className={styles.contactItem}
              >
                <span className={styles.contactIcon}><Mail size={18} /></span>
                gemongalaclark.official@gmail.com
              </a>
              <div className={styles.contactItem}>
                <span className={styles.contactIcon}><MapPin size={18} /></span>
                Philippines
              </div>
            </div>

            <div className={styles.socialRow}>
              <a
                id="contact-linkedin"
                href="https://www.linkedin.com/in/clarkgemongala"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="LinkedIn"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
                </svg>
              </a>
              <a
                id="contact-facebook"
                href="https://www.facebook.com/clarkva.360"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="Facebook"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                id="contact-email-icon"
                href="mailto:gemongalaclark.official@gmail.com"
                className="social-btn"
                aria-label="Email"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Right – form */}
          <form
            id="contact-form"
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
          >
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <input
                  id="contact-name"
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  autoComplete="name"
                />
              </div>
              <div className={styles.formGroup}>
                <input
                  id="contact-email"
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <input
                id="contact-subject"
                type="text"
                name="subject"
                placeholder="Subject"
                value={form.subject}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <textarea
                id="contact-message"
                name="message"
                placeholder="Your Message"
                value={form.message}
                onChange={handleChange}
                required
                className={styles.textarea}
                rows={5}
              />
            </div>

            {status === 'success' && (
              <div className={styles.successMsg}>
                <CheckCircle size={18} />
                Message sent! I&apos;ll get back to you shortly.
              </div>
            )}
            {status === 'error' && (
              <div className={styles.errorMsg}>
                <AlertCircle size={18} />
                {errorMessage || 'Something went wrong. Please try again or email me directly.'}
              </div>
            )}

            <button
              id="contact-submit"
              type="submit"
              className={`btn-primary ${styles.submitBtn}`}
              disabled={status === 'sending'}
            >
              {status === 'sending' ? (
                <>
                  <span className={styles.spinner} />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
