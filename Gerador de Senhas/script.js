// --- SELETORES DE ELEMENTOS ---
const passwordOutput = document.getElementById('passwordOutput');
const copyButton = document.getElementById('copyButton');
const lengthSlider = document.getElementById('length');
const lengthValue = document.getElementById('lengthValue');
const generateButton = document.getElementById('generateButton');
const errorMessage = document.getElementById('error-message');

const includeUppercase = document.getElementById('includeUppercase');
const includeLowercase = document.getElementById('includeLowercase');
const includeNumbers = document.getElementById('includeNumbers');
const includeSymbols = document.getElementById('includeSymbols');
const optionsCheckboxes = [includeUppercase, includeLowercase, includeNumbers, includeSymbols];
const optionsContainer = document.getElementById('options-container');

const strengthContainer = document.getElementById('strength-container');
const strengthColor = document.getElementById('strength-color');
const strengthText = document.getElementById('strength-text');

// --- Elementos da API Gemini ---
const generateMemorableButton = document.getElementById('generateMemorableButton');
const generateHintButton = document.getElementById('generateHintButton');
const geminiOutputContainer = document.getElementById('gemini-output-container');
const geminiOutputTitle = document.getElementById('gemini-output-title');
const geminiSpinner = document.getElementById('gemini-spinner');
const geminiOutputResult = document.getElementById('gemini-output-result');

// --- CONSTANTES ---
const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
const numberChars = '0123456789';
const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

// --- FUNÇÕES DE GERAÇÃO DE SENHA ---

function generateRandomPassword() {
    optionsContainer.classList.remove('hidden'); // Mostra opções
    errorMessage.textContent = '';
    
    const length = parseInt(lengthSlider.value);
    const options = getSelectedOptions();
    if (options.charset === '') {
        errorMessage.textContent = 'Selecione ao menos um tipo de caractere.';
        updatePasswordStrength(null);
        return;
    }

    let password = '';
    const guaranteedChars = [];
    
    if (options.uppercase) guaranteedChars.push(getRandomChar(uppercaseChars));
    if (options.lowercase) guaranteedChars.push(getRandomChar(lowercaseChars));
    if (options.numbers) guaranteedChars.push(getRandomChar(numberChars));
    if (options.symbols) guaranteedChars.push(getRandomChar(symbolChars));

    for (let i = guaranteedChars.length; i < length; i++) {
        password += getRandomChar(options.charset);
    }
    
    password = shuffleArray([...password.split(''), ...guaranteedChars]).join('');

    passwordOutput.value = password;
    updatePasswordStrength(password);
    geminiOutputContainer.classList.add('hidden');
}

// --- FUNÇÕES DA API GEMINI ---

async function callGemini(prompt) {
    geminiSpinner.classList.remove('hidden');
    geminiOutputResult.textContent = '';
    
    const apiKey = ""; // Deixe em branco, será tratado pelo ambiente
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0) {
           return result.candidates[0].content.parts[0].text.trim();
        } else {
           throw new Error("Resposta da API inválida.");
        }

    } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        return `Erro: Não foi possível obter uma resposta da IA. ${error.message}`;
    } finally {
        geminiSpinner.classList.add('hidden');
    }
}

async function generateMemorablePassword() {
    optionsContainer.classList.add('hidden'); // Esconde opções
    geminiOutputContainer.classList.remove('hidden');
    geminiOutputTitle.innerHTML = `<i data-feather="sparkles" class="w-5 h-5 mr-2"></i> Criando Frase Secreta...`;
    feather.replace();

    const prompt = "Crie uma frase secreta segura e memorável. Use 4 palavras comuns em português, não relacionadas, separadas por hífens. Exemplo: bateria-cavalo-correto-grampo. As palavras devem ser em minúsculas e sem acentos.";
    const result = await callGemini(prompt);
    
    if (!result.startsWith("Erro:")) {
        passwordOutput.value = result;
        updatePasswordStrength(result);
        geminiOutputContainer.classList.add('hidden');
    } else {
        geminiOutputResult.textContent = result;
    }
}

async function generateHint() {
    const password = passwordOutput.value;
    if (!password) {
        errorMessage.textContent = "Gere uma senha primeiro.";
        return;
    }
    geminiOutputContainer.classList.remove('hidden');
    geminiOutputTitle.innerHTML = `<i data-feather="sparkles" class="w-5 h-5 mr-2"></i> Dica Memorável`;
    feather.replace();

    const prompt = `Crie uma dica mnemônica e criativa para a senha '${password}'. A dica não deve conter nenhum dos caracteres da senha. Deve ser uma pista abstrata ou uma frase que ajude o usuário a lembrar da senha sem revelá-la. Responda em português brasileiro em uma frase curta.`;
    geminiOutputResult.textContent = await callGemini(prompt);
}

async function analyzeStrength() {
     const password = passwordOutput.value;
    if (!password) return;
    geminiOutputContainer.classList.remove('hidden');
    geminiOutputTitle.innerHTML = `<i data-feather="sparkles" class="w-5 h-5 mr-2"></i> Análise de Força`;
    feather.replace();

    const prompt = `Analise a força da seguinte senha: '${password}'. Explique em um parágrafo curto e simples o motivo da sua força (ou fraqueza), considerando o comprimento, variedade de caracteres e imprevisibilidade. Responda em português brasileiro.`;
    geminiOutputResult.textContent = await callGemini(prompt);
}

// --- FUNÇÕES DE UI E UTILITÁRIAS ---

function updatePasswordStrength(password) {
    if (!password) {
        strengthColor.style.width = '0%';
        strengthText.textContent = 'Vazio';
        strengthColor.className = 'h-full rounded-full bg-gray-500';
        strengthText.className = 'text-sm font-medium text-gray-500 w-20 text-right';
        return;
    }

    const length = password.length;
    let optionsCount = 0;
    // Verifica a presença de maiúsculas, minúsculas, números e símbolos na senha gerada
    if (/[A-Z]/.test(password)) optionsCount++;
    if (/[a-z]/.test(password)) optionsCount++; 
    if (/[0-9]/.test(password)) optionsCount++;
    if (/[^A-Za-z0-9]/.test(password)) optionsCount++;
    
    let score = optionsCount * 1.5;
    if (length >= 12) score += 2;
    if (length >= 16) score += 2;
    if (length >= 24) score += 2;

    const percentage = Math.min((score / 12) * 100, 100);
    strengthColor.style.width = `${percentage}%`;

    if (percentage < 40) {
        strengthColor.className = 'h-full rounded-full bg-red-500';
        strengthText.textContent = 'Fraca';
        strengthText.className = 'text-sm font-medium text-red-400 w-20 text-right';
    } else if (percentage < 75) {
        strengthColor.className = 'h-full rounded-full bg-yellow-500';
        strengthText.textContent = 'Média';
        strengthText.className = 'text-sm font-medium text-yellow-400 w-20 text-right';
    } else {
        strengthColor.className = 'h-full rounded-full bg-green-500';
        strengthText.textContent = 'Forte';
        strengthText.className = 'text-sm font-medium text-green-400 w-20 text-right';
    }
}

function copyToClipboard(textToCopy, feedbackElement) {
    if (!textToCopy) return;
    document.execCommand('copy'); // Use document.execCommand for clipboard operations
    // Show feedback
    const originalIcon = feedbackElement.innerHTML;
    feedbackElement.innerHTML = `<i data-feather="check" class="w-5 h-5 text-green-400"></i>`;
    feather.replace();
    setTimeout(() => {
        feedbackElement.innerHTML = originalIcon;
        feather.replace();
    }, 2000);
}

const getSelectedOptions = () => ({
    uppercase: includeUppercase.checked,
    lowercase: includeLowercase.checked,
    numbers: includeNumbers.checked,
    symbols: includeSymbols.checked,
    charset: (includeUppercase.checked ? uppercaseChars : '') + (includeLowercase.checked ? lowercaseChars : '') + (includeNumbers.checked ? numberChars : '') + (includeSymbols.checked ? symbolChars : '')
});
const getRandomChar = (str) => str[Math.floor(Math.random() * str.length)];
const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

// --- EVENT LISTENERS ---
generateButton.addEventListener('click', generateRandomPassword);
generateMemorableButton.addEventListener('click', generateMemorablePassword);
generateHintButton.addEventListener('click', generateHint);
strengthContainer.addEventListener('click', analyzeStrength);

copyButton.addEventListener('click', () => copyToClipboard(passwordOutput.value, copyButton));
lengthSlider.addEventListener('input', (e) => lengthValue.textContent = e.target.value);
optionsCheckboxes.forEach(cb => cb.addEventListener('change', () => {
    // Se uma opção for alterada, volta para o modo de geração aleatória
    if(optionsContainer.classList.contains('hidden')){
        generateRandomPassword();
    }
}));


// --- INICIALIZAÇÃO ---
window.onload = () => {
    feather.replace();
    generateRandomPassword();
};
