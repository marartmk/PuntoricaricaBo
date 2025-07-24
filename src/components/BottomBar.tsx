// components/BottomBar.tsx
import React, { useState } from "react";
import { Shield, X, Info, Lock, Users, FileText } from "lucide-react";
import styles from "./BottomBar.module.css";

const BottomBar: React.FC = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const openPrivacyModal = () => {
    setShowPrivacyModal(true);
  };

  const closePrivacyModal = () => {
    setShowPrivacyModal(false);
  };

  return (
    <>
      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className={styles.container}>
          <div className={styles.leftSection}>
            <span className={styles.copyright}>
              Copyright © {new Date().getFullYear()} Next S.r.l. Franchising
              Clinica Iphone. Tutti i diritti riservati.
            </span>
          </div>

          <div className={styles.rightSection}>
            <button className={styles.privacyLink} onClick={openPrivacyModal}>
              <Shield className={styles.privacyIcon} />
              Informazioni riservate Clinica iPhone
            </button>
          </div>
        </div>
      </div>

      {/* Privacy Modal */}
      {showPrivacyModal && (
        <div className={styles.modalOverlay} onClick={closePrivacyModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleSection}>
                <Shield className={styles.modalIcon} />
                <h2 className={styles.modalTitle}>
                  Informazioni riservate Clinica iPhone
                </h2>
              </div>
              <button
                className={styles.closeButton}
                onClick={closePrivacyModal}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              <div className={styles.importantSection}>
                <div className={styles.importantBadge}>
                  <Info size={16} />
                  <span>Importante</span>
                </div>

                <div className={styles.contentCard}>
                  <div className={styles.cardHeader}>
                    <Lock className={styles.cardIcon} />
                    <h3>Informazioni Riservate</h3>
                  </div>

                  <div className={styles.cardContent}>
                    <p>
                      <strong>Next S.r.l.</strong> considera riservate le
                      informazioni contenute in questo sito (
                      <em>"Informazioni riservate"</em>). Non è consentito
                      inoltrare, copiare o duplicare con altri mezzi, diffondere
                      verbalmente, elettronicamente o tramite stampa (inclusi
                      fax, e-mail e altri mezzi di comunicazione elettronica) le
                      informazioni contenute in questo sito senza il preventivo
                      consenso scritto di Next S.r.l., fatta eccezione per i
                      membri dell'organizzazione che le richiedano per esigenze
                      aziendali legittime e che abbiano sottoscritto un accordo
                      di riservatezza.
                    </p>
                  </div>
                </div>

                <div className={styles.featuresGrid}>
                  <div className={styles.featureCard}>
                    <Users className={styles.featureIcon} />
                    <h4>Accesso Limitato</h4>
                    <p>
                      Solo personale autorizzato può accedere alle informazioni
                      riservate
                    </p>
                  </div>

                  <div className={styles.featureCard}>
                    <FileText className={styles.featureIcon} />
                    <h4>Accordo di Riservatezza</h4>
                    <p>
                      Tutti i membri devono sottoscrivere un accordo di
                      riservatezza
                    </p>
                  </div>

                  <div className={styles.featureCard}>
                    <Shield className={styles.featureIcon} />
                    <h4>Protezione Dati</h4>
                    <p>
                      Tutte le informazioni sono protette secondo le normative
                      vigenti
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <div className={styles.footerInfo}>
                <span className={styles.footerText}>
                  © {new Date().getFullYear()} Next S.r.l. - Tutti i diritti riservati
                </span>
              </div>
              <button
                className={styles.understandButton}
                onClick={closePrivacyModal}
              >
                Ho compreso
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomBar;
