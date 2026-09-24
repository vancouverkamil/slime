var slimeWalletAddress = localStorage.getItem('slimeWalletAddress') || '';

function shortWalletAddress(address) {
  if (!address || address.length < 12) return address || '';
  return address.slice(0, 6) + '...' + address.slice(-4);
}

function refreshWalletUi() {
  var topBtn = document.getElementById('TopWalletBtn');
  if (topBtn) topBtn.textContent = slimeWalletAddress ? shortWalletAddress(slimeWalletAddress) : 'CONNECT WALLET';
}

async function connectSlimeWallet() {
  var provider = window.ethereum || window.coinbaseWalletExtension;
  if (!provider || !provider.request) {
    alert('No browser wallet found. Install Coinbase Wallet or another injected web3 wallet to connect.');
    return;
  }
  try {
    var accounts = await provider.request({ method: 'eth_requestAccounts' });
    slimeWalletAddress = accounts && accounts[0] ? accounts[0] : '';
    if (slimeWalletAddress) localStorage.setItem('slimeWalletAddress', slimeWalletAddress);
    refreshWalletUi();
  } catch (err) {
    console.warn('Wallet connection cancelled or failed', err);
  }
}

document.addEventListener('DOMContentLoaded', refreshWalletUi);
