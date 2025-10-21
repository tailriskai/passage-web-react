import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PhoneInput, defaultCountries, parseCountry } from 'react-international-phone';
import 'react-international-phone/style.css';
import { QRCode } from '../QRCode';
import styles from './AppClipPage.module.css';
import defaultLogoImage from './logo.png';

// Filter countries to only show USA, Canada, and Poland
const countries = defaultCountries.filter(country => {
  const { iso2 } = parseCountry(country);
  return ['us', 'ca', 'pl'].includes(iso2);
});

interface DesktopViewProps {
  isLoading: boolean;
  isCheckingWriteOperation: boolean;
  writeOperationAlreadyCompleted: boolean;
  config: any;
  integrationName: string;
  qrCodeUrl: string;
  qrCodeSize: number;
  isIosMobile: boolean;
  logoUrl?: string;
}

export const DesktopView: React.FC<DesktopViewProps> = ({
  isLoading,
  isCheckingWriteOperation,
  writeOperationAlreadyCompleted,
  config,
  integrationName,
  qrCodeUrl,
  qrCodeSize,
  isIosMobile,
  logoUrl
}) => {
  const [phoneNumber, setPhoneNumber] = useState('+1');
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    // Validate phone number
    const isValid = phoneNumber.startsWith('+') && phoneNumber.length >= 10 && /^\+\d{9,15}$/.test(phoneNumber);
    setIsPhoneValid(isValid);
  }, [phoneNumber]);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendSMS = async () => {
    if (!phoneNumber || !isPhoneValid) {
      setMessage({ type: 'error', text: 'Please enter a valid phone number' });
      return;
    }

    setIsSending(true);
    setMessage(null);

    // Simulate SMS sending (in real app, this would call an API)
    setTimeout(() => {
      setMessage({ type: 'success', text: 'SMS sent successfully!' });
      setCountdown(60);
      setPhoneNumber('+1');
      setIsSending(false);
    }, 1000);
  };

  const renderLogo = () => {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
        style={{ marginTop: "-14px", marginBottom: "0.2rem" }}
      >
        <img
          src={logoUrl || defaultLogoImage}
          alt="Passage Logo"
          width={80}
          height={80}
          className={styles.logoImage}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            // Show fallback
            const fallback = target.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      </motion.div>
    );
  };

  const renderFallbackLogo = () => (
      <div style={{
        width: '80px',
        height: '80px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '36px',
        fontWeight: 'bold',
        color: 'white'
      }}>
        P
      </div>
    );

  return (
    <div className={styles.androidContainer}>
      <div className={styles.blurOverlay}></div>
      <div className={styles.background}>
        <div className={styles.glowOrb1}></div>
        <div className={styles.glowOrb2}></div>
        <div className={styles.glowOrb3}></div>
        <div className={styles.glowOrb4}></div>
      </div>
      <div className={styles.content}>
        <AnimatePresence mode="wait">
          {/* Loading spinner */}
          {(isLoading || isCheckingWriteOperation) ? (
            <motion.div
              key="loading"
              className={styles.loadingCard}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <div className={styles.spinner}></div>
            </motion.div>
          ) : writeOperationAlreadyCompleted ? (
            // Already completed state
            <motion.div
              key="error"
              className={styles.desktopCard}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                style={{ marginTop: "-14px", marginBottom: "0.5rem" }}
              >
                {renderLogo()}
              </motion.div>

              <motion.h2
                className={styles.desktopTitle}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
              >
                Already Completed
              </motion.h2>

              <motion.p
                style={{
                  color: "#ffffff",
                  fontSize: "16px",
                  margin: "40px 20px 20px 20px",
                  textAlign: "center",
                  fontWeight: 400
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Funds were already added to your {integrationName} account
              </motion.p>
            </motion.div>
          ) : (
            // Main content
            <motion.div
              key="content"
              className={styles.desktopCard}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              {/* iOS Mobile View */}
              {isIosMobile ? (
                <>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                    style={{ marginTop: "-20px" }}
                  >
                    {renderLogo()}
                  </motion.div>

                  <motion.h2
                    className={styles.desktopTitle}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                  >
                    {config?.integrationName
                      ? `Link your ${config.integrationName} account`
                      : "Link your account"}
                  </motion.h2>

                  <motion.p
                    className={styles.desktopSubtitle}
                    style={{ marginTop: "0.5rem" }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    Built by the team behind Plaid
                  </motion.p>

                  <motion.a
                    href={qrCodeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.openAppClipButton}
                    style={{ marginBottom: "0.5rem" }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.5, ease: "easeOut" }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Connect {config?.integrationName || ""}
                  </motion.a>

                  <motion.p
                    style={{
                      position: "absolute",
                      bottom: "12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontSize: "0.75rem",
                      fontWeight: 300,
                      color: "rgba(255, 255, 255, 0.4)",
                      margin: 0
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                  >
                    Credentials never stored
                  </motion.p>
                </>
              ) : (
                // Desktop View with QR Code
                <>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
                    style={{ marginTop: "-14px", marginBottom: "0.2rem" }}
                  >
                    {renderLogo()}
                  </motion.div>

                  <motion.h2
                    className={styles.desktopTitle}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
                  >
                    {config?.integrationName
                      ? `Link your ${config.integrationName} account`
                      : "Link your account"}
                  </motion.h2>

                  <motion.p
                    className={styles.desktopSubtitle}
                    style={{ marginTop: "0.2rem", marginBottom: "2rem" }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    Securely connect with your iPhone
                  </motion.p>

                  {/* QR Code Section */}
                  <motion.div
                    className={styles.qrCodeSection}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <div className={styles.qrCodeWrapper}>
                      <QRCode
                        value={qrCodeUrl}
                        size={qrCodeSize}
                        backgroundColor="#FFFFFF"
                        foregroundColor="#000000"
                      />
                    </div>
                  </motion.div>

                  {/* Divider */}
                  <motion.div
                    style={{
                      position: 'relative',
                      textAlign: 'center',
                      margin: '32px 0'
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: 0,
                      width: '40%',
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.2)'
                    }}></div>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      right: 0,
                      width: '40%',
                      height: '1px',
                      background: 'rgba(255, 255, 255, 0.2)'
                    }}></div>
                    <span className={styles.dividerSpan}>or</span>
                  </motion.div>

                  <motion.p
                    className={styles.desktopSubtitle}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                  >
                    SMS a link to your iPhone
                  </motion.p>

                  {/* Phone Input Section */}
                  <motion.div
                    className={styles.phoneInputSection}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.5 }}
                  >
                    <div className={styles.phoneInputWrapper}>
                      <PhoneInput
                        defaultCountry="us"
                        countries={countries}
                        value={phoneNumber}
                        onChange={phone => setPhoneNumber(phone)}
                        placeholder="Enter phone number"
                        className={styles.phoneInput}
                        disabled={isSending || countdown > 0}
                      />
                    </div>

                    <motion.button
                      className={styles.sendButton}
                      onClick={handleSendSMS}
                      disabled={isSending || countdown > 0 || !isPhoneValid}
                      whileHover={{ scale: isSending || countdown > 0 || !isPhoneValid ? 1 : 1.02 }}
                      whileTap={{ scale: isSending || countdown > 0 || !isPhoneValid ? 1 : 0.98 }}
                    >
                      {isSending ? "Sending..." : countdown > 0 ? `Wait ${countdown}s` : "Send SMS"}
                    </motion.button>

                    {message && (
                      <motion.div
                        className={`${styles.message} ${styles[message.type]}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {message.text}
                      </motion.div>
                    )}
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};