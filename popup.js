import { setSessionData, getSessionData, rpcClient, initKaspa, reloadAccounts } from './kaspaUtils.js';
import { showToast, showScreen } from './uiUtils.js';
import { handleWallet, logout, resetWallet, confirmMnemonic, importWallet, exportWalletSeed } from './walletHandlers.js';
import { sendKas } from './transactionHandlers.js';
import { populateAccountSelector, displayAccountDetails, switchAccount, createNewAccount, exportPrivateKey } from './accountHandlers.js';

async function loadNetwork() {
    const response = await getSessionData();
    const network = response.network || 'testnet-11';
    document.getElementById('network').value = network;
}

async function reloadAccountDetails() {
    const sessionData = await getSessionData();
    console.log("Reloading account details with session data:", sessionData);
    if (sessionData.accounts.length > 0) {
        populateAccountSelector(sessionData.accounts);
        displayAccountDetails(sessionData.accounts[sessionData.currentAccountSelected-1]);
        const accountSelector = document.getElementById('accountSelector');
        accountSelector.selectedIndex = sessionData.currentAccountSelected-1;
        const currentAccountNumberElement = document.getElementById('current-account-number');
        currentAccountNumberElement.textContent = `Account #${sessionData.currentAccountSelected}`;
    } else {
        console.log("No accounts found in session data.");
    }
}

async function switchNetwork(network) {
    const sessionData = await getSessionData();
    const kaspaApiUrl = network === 'mainnet' ? 'ws://57.129.38.168:17110' : 'ws://57.129.49.28:17210';
    await setSessionData({ network, kaspaApiUrl });
    console.log(`Network updated to ${network} with URL ${kaspaApiUrl}`);

    if (sessionData.encryptedSeed && sessionData.password) {
        try {
            await initKaspa();
            await reloadAccounts();  // Make sure accounts are reloaded correctly
            await reloadAccountDetails();
            console.log("Network updated successfully");
        } catch (error) {
            console.error("Failed to update network:", error);
            showToast("Failed to update network. Please try again.", "error");
        }
    } else {
        console.log("No encrypted seed or password found, skipping account reload.");
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const screenInitial = document.getElementById('screen-initial');
    const screenUnlockWallet = document.getElementById('screen-unlock-wallet');
    const screenWallet = document.getElementById('screen-wallet');
    const screenShowMnemonic = document.getElementById('screen-show-mnemonic');
    const screenConfirmMnemonic = document.getElementById('screen-confirm-mnemonic');
    const screenResetWallet = document.getElementById('screen-reset-wallet');
    const screenImportWallet = document.getElementById('screen-import-wallet');

    const storedEncryptedSeed = localStorage.getItem('encryptedSeed');
    let sessionData = await getSessionData();

    await setSessionData({ lastActivityTime: Date.now() });

    if (sessionData.encryptedSeed && sessionData.password && sessionData.isLoggedIn) {
        showScreen(screenWallet);
        try {
            await initKaspa();
            await reloadAccountDetails();
        } catch (error) {
            console.error("Failed to retrieve wallet data:", error);
            showToast("Failed to retrieve wallet data.", "error");
        }
    }else if (storedEncryptedSeed) {
        showScreen(screenUnlockWallet);
    } else {
        showScreen(screenInitial);
    }

    document.getElementById('createWallet').addEventListener('click', () => handleWallet(true, screenShowMnemonic, screenWallet));
    document.getElementById('unlockWallet').addEventListener('click', () => handleWallet(false, screenShowMnemonic, screenWallet));
    document.getElementById('logout').addEventListener('click', () => logout(screenUnlockWallet));
    document.getElementById('confirmSavedWords').addEventListener('click', () => showScreen(screenConfirmMnemonic));
    document.getElementById('confirmMnemonicButton').addEventListener('click', () => confirmMnemonic(screenWallet));
    document.getElementById('forgetPassword').addEventListener('click', () => showScreen(screenResetWallet));
    document.getElementById('resetWalletButton').addEventListener('click', () => resetWallet(screenWallet));
    document.getElementById('importWallet').addEventListener('click', () => showScreen(screenImportWallet));
    document.getElementById('createNewAccount').addEventListener('click', createNewAccount);
    document.getElementById('importWalletButton').addEventListener('click', () => importWallet(screenWallet));
    document.getElementById('sendKasButton').addEventListener('click', sendKas);
    document.getElementById('accountSelector').addEventListener('change', switchAccount);
    document.getElementById('exportAccountPrivateKey').addEventListener('click', exportPrivateKey);
    document.getElementById('resetWallet').addEventListener('click', () => showScreen(screenResetWallet));
    document.getElementById('exportWalletSeed').addEventListener('click', exportWalletSeed);

    document.getElementById('unlockPassword').addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.keyCode === 13) {
            handleWallet(false, screenShowMnemonic, screenWallet);
        }
    });

    document.getElementById('copyAddressButton').addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('accountAddress').textContent).then(() => {
            showToast("Address copied to clipboard!", "success");
        }).catch(() => {
            showToast("Failed to copy address.", "error");
        });
    });

    document.getElementById('network').addEventListener('change', async function () {
        const network = this.value;
        await switchNetwork(network);
    });

    loadNetwork();

    window.addEventListener('unload', async () => {
        await setSessionData({ lastActivityTime: Date.now() });
        if (rpcClient && rpcClient.isConnected) await rpcClient.disconnect();
    });
});

