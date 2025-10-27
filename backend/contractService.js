import { ThorClient } from '@vechain/sdk-network';
import pkg, { networkInfo } from '@vechain/sdk-core';
const { Address, Hex, Secp256k1, ABIContract, Transaction } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Contract configuration
const CONTRACT_ADDRESS = '0xcb0e9d8e05b70f9ed499398911a289570a9ccf24';
const NETWORK_URL = 'https://testnet.vechain.org/';
const REGISTRAR_PRIVATE_KEY = process.env.VECHAIN_PRIVATE_KEY;

// Contract ABI for gradeSubmission function
const GRADE_SUBMISSION_ABI = [{
  name: 'gradeSubmission',
  type: 'function',
  inputs: [
    { name: 'studentAddress', type: 'address' },
    { name: 'approved', type: 'bool' }
  ],
  outputs: [],
  stateMutability: 'nonpayable'
}];

// Initialize VeChain SDK
const thor = ThorClient.at(NETWORK_URL); // ThorClient.from is depracated

export async function gradeSubmissionOnChain(studentAddress, approved) {
  try {
    console.log(`Calling gradeSubmission for ${studentAddress}, approved: ${approved}`);

    // Create private key buffer
    const privateKeyBuffer = Hex.of(REGISTRAR_PRIVATE_KEY).bytes;
    
    // Derive the registrar address
    const publicKey = Secp256k1.derivePublicKey(privateKeyBuffer);
    const registrarAddress = Address.ofPublicKey(publicKey);
    console.log('Registrar address:', registrarAddress.toString());

    // Get the latest block
    const bestBlock = await thor.blocks.getBestBlockCompressed();
    
    const encodedData = ABIContract.ofAbi(GRADE_SUBMISSION_ABI).encodeFunctionInput('gradeSubmission', [studentAddress, approved])
    const digitsFromData = "0x" + encodedData.digits;
    // Create transaction clause
    const clause = {
      to: CONTRACT_ADDRESS,
      value: '0x0',
      data: digitsFromData
    };

    console.log('Transaction clause:', clause);

    // Build transaction
    const txBody = {
      chainTag: networkInfo.testnet.chainTag,
      blockRef: bestBlock.id.slice(0, 18),
      expiration: 32,
      clauses: [clause],
      gasPriceCoef: 0,
      gas: 200000,
      dependsOn: null,
      nonce: Date.now().toString()
    };

    console.log('Transaction body:', txBody);

    // Sign and send transaction
    const signedTx = Transaction.of(txBody).sign(privateKeyBuffer);
    const txId = await thor.transactions.sendTransaction(signedTx);
    
    console.log('Transaction sent:', txId);
    
    // Wait for transaction receipt
    const receipt = await txId.wait(60000);
    
    if (receipt && !receipt.reverted) {
      console.log('Transaction successful:', txId);
      return {
        success: true,
        txId: txId.id,
        receipt: receipt
      };
    } else {
      console.error('Transaction reverted:', receipt);
      return {
        success: false,
        txId: txId.id,
        error: 'Transaction was reverted'
      };
    }

  } catch (error) {
    console.error('Error calling gradeSubmission:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function waitForTransaction(txId, timeout = 30000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const receipt = await thor.transactions.getTransactionReceipt(txId);
      if (receipt) {
        return receipt;
      }
    } catch (error) {
      // Transaction not found yet, continue waiting
    }
    
    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error('Transaction timeout');
}