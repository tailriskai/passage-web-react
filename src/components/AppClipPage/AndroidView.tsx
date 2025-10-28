import React from 'react';
import { motion } from 'framer-motion';
import styles from './AppClipPage.module.css';
import defaultLogoImage from './logo.png';

interface AndroidViewProps {
  onSendToIos: () => void;
  logoUrl?: string;
  modalMode?: boolean; // Enable modal presentation style
}

export const AndroidView: React.FC<AndroidViewProps> = ({ onSendToIos, logoUrl, modalMode = false }) => {
  return (
    <div
      className={styles.androidContainer}
      style={modalMode ? {
        position: 'relative',
        width: 'auto',
        height: 'auto',
        minWidth: '320px',
        minHeight: '300px',
        maxWidth: '650px',
        overflow: 'visible',
        borderRadius: '24px',
      } : undefined}
    >
      {/* Only render background layers in full-page mode */}
      {!modalMode && (
        <>
          <div className={styles.blurOverlay}></div>
          <div className={styles.background}>
            <div className={styles.glowOrb1}></div>
            <div className={styles.glowOrb2}></div>
            <div className={styles.glowOrb3}></div>
            <div className={styles.glowOrb4}></div>
          </div>
        </>
      )}
      <div className={styles.content}>
        <motion.div
          className={styles.messageCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            style={{ marginTop: "-14px", marginBottom: "0.2rem" }}
          >
            <img
              src={logoUrl || defaultLogoImage}
              alt="Logo"
              width={80}
              height={80}
              className={styles.logoImage}
              onError={(e) => {
                // Fallback to a gradient div if image fails
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.style.width = '80px';
                fallback.style.height = '80px';
                fallback.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                fallback.style.borderRadius = '20px';
                fallback.style.display = 'flex';
                fallback.style.alignItems = 'center';
                fallback.style.justifyContent = 'center';
                fallback.style.fontSize = '36px';
                fallback.style.fontWeight = 'bold';
                fallback.style.color = 'white';
                fallback.textContent = 'P';
                target.parentNode?.replaceChild(fallback, target);
              }}
            />
          </motion.div>

          <motion.p
            className={styles.description}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            Passage Connect <br /> is not yet available for Android.
          </motion.p>
          <motion.p
            className={styles.subdescription}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            We're working hard to bring the seamless connection experience to Android devices.
            Stay tuned!
          </motion.p>
          <motion.button
            className={styles.sendToIosButton}
            onClick={onSendToIos}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Send link to iOS
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};