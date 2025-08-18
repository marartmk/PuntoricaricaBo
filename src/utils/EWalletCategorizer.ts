
export type TipologiaEWallet = "DEPOSITI" | "PRELIEVI" | "ALTRO";

export class EWalletTransactions {
  /**
   * Categorizza una transazione E-Wallet basandosi sulla logica specifica:
   * - E-Wallet se SchDescrizioneCS = 'AP WALLET'
   * - DEPOSITI se importo > 0
   * - PRELIEVI se importo < 0
   */
  static CategorizeTransactions(
    _schProvacy1: string | null,
    _schTipoOperazione: string | null,
    _schDlrRagSoc: string | null,
    schDescrizioneCS: string | null,
    schImportoRic: number | null
  ): TipologiaEWallet {
    const descrizione = (schDescrizioneCS || "").toUpperCase().trim();
    const importo = schImportoRic || 0;

    // ✅ LOGICA SPECIFICA E-WALLET: Solo 'AP WALLET'
    if (descrizione === 'AP WALLET') {
      if (importo > 0) {
        return "DEPOSITI";
      } else if (importo < 0) {
        return "PRELIEVI";
      }
    }

    return "ALTRO";
  }

  static IsEWalletTransaction(schDescrizioneCS: string | null): boolean {
    const descrizione = (schDescrizioneCS || "").toUpperCase().trim();
    return descrizione === 'AP WALLET';
  }
}