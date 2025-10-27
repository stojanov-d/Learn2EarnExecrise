import React, { useState } from 'react';
import { claimReward as claimRewardApi } from '../services/api';

function ClaimReward({ account, onClaimSuccess }) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStatus, setClaimStatus] = useState(null);
  const [txId, setTxId] = useState(null);

  const handleClaimReward = async () => {
    if (!account) {
      setClaimStatus({ type: 'error', message: 'Wallet not connected' });
      return;
    }

    setIsClaiming(true);
    setClaimStatus(null);

    try {
      // Call the backend API to claim the reward
      const data = await claimRewardApi(account);

      setTxId(data.txId);
      setClaimStatus({
        type: 'success',
        message: 'Reward claim submitted! Transaction is being processed.'
      });

      // Let parent refresh current status
      if (typeof onClaimSuccess === 'function') {
        onClaimSuccess();
      }

    } catch (error) {
      console.error('Error claiming reward:', error);
      setClaimStatus({
        type: 'error',
        message: error.message || 'Failed to claim reward. Please try again.'
      });
    } finally {
      setIsClaiming(false);
    }
  };

  const openExplorer = () => {
    if (txId && txId !== 'pending') {
      window.open(`https://explore-testnet.vechain.org/transactions/${txId}`, '_blank');
    }
  };

  return (
    <div className="reward-section">
      <h3>Congratulations! Your submission has been approved</h3>
      <p>You can now claim your B3TR token reward</p>
      
      <button
        className="btn btn-success"
        onClick={handleClaimReward}
        disabled={isClaiming}
      >
        {isClaiming ? (
          <>
            <span className="loading"></span> Claiming Reward...
          </>
        ) : (
          'Claim Reward'
        )}
      </button>

      {claimStatus && (
        <div className={`status-message ${claimStatus.type}`}>
          {claimStatus.message}
          {txId && claimStatus.type === 'success' && (
            <div style={{ marginTop: '0.5rem' }}>
              <button
                onClick={openExplorer}
                style={{
                  background: 'transparent',
                  border: '1px solid currentColor',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                View on Explorer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ClaimReward;