import React, { useState, useMemo } from 'react';
import { submitProof as submitProofApi } from '../services/api';
import { useWallet, useSendTransaction, useTransactionModal } from '@vechain/vechain-kit';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract';

function ProofSubmissionForm({ account, onSubmissionSuccess, disabled }) {
  const [formData, setFormData] = useState({
    name: '',
    proofLink: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // NEW: wallet + tx helpers
  const { account: walletAccount } = useWallet();
  const { open: openTransactionModal } = useTransactionModal();
  const currentAccount = walletAccount?.address || account;

  // NEW: build submitProof clause
  const submitProofABI = useMemo(
    () => CONTRACT_ABI.find(fn => fn.name === 'submitProof'),
    []
  );
  const submitProofClauses = useMemo(() => {
    const proof = formData.proofLink.trim();
    if (!proof || !submitProofABI) return [];
    const iface = new ethers.Interface(CONTRACT_ABI);
    return [{
      to: CONTRACT_ADDRESS,
      value: '0',
      data: iface.encodeFunctionData('submitProof', [proof]),
      comment: `Submit proof link`,
      abi: submitProofABI
    }];
  }, [formData.proofLink]);

  const { sendTransaction } = useSendTransaction({
    signerAccountAddress: currentAccount ?? ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.proofLink.trim()) {
      setError('Please fill in all fields');
      return;
    }
    if (!formData.proofLink.startsWith('http://') && !formData.proofLink.startsWith('https://')) {
      setError('Please enter a valid URL for the proof link');
      return;
    }
    if (!currentAccount || currentAccount === '*') {
      setError('Please connect your wallet first');
      return;
    }
    if (submitProofClauses.length === 0) {
      setError('Transaction not ready. Please check form data.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1) On-chain submitProof from the student's wallet
      openTransactionModal();
      await sendTransaction(submitProofClauses);

      // 2) Persist to backend for moderation/workflow
      await submitProofApi({
        walletAddress: currentAccount.toLowerCase(),
        name: formData.name,
        proofLink: formData.proofLink
      });

      setSuccess(true);
      setFormData({ name: '', proofLink: '' });
      onSubmissionSuccess();
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err?.reason || err?.message || 'Failed to submit proof. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter your name"
          disabled={disabled || isSubmitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="proofLink">Proof Link</label>
        <input
          type="url"
          id="proofLink"
          name="proofLink"
          value={formData.proofLink}
          onChange={handleChange}
          placeholder="https://github.com/yourrepo or screenshot link"
          disabled={disabled || isSubmitting}
        />
      </div>

      <button 
        type="submit" 
        className="btn" 
        disabled={disabled || isSubmitting || !account}
      >
        {isSubmitting ? (
          <>
            <span className="loading"></span> Submitting...
          </>
        ) : (
          'Submit Proof'
        )}
      </button>

      {error && (
        <div className="status-message error">
          {error}
        </div>
      )}

      {success && (
        <div className="status-message success">
          Proof submitted successfully! Waiting for moderator approval.
        </div>
      )}

      {disabled && (
        <div className="status-message info">
          You have already submitted your proof. Please wait for approval.
        </div>
      )}
    </form>
  );
}

export default ProofSubmissionForm;