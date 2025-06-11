const app = document.getElementById('app');
const question = document.getElementById('question');
const answer = document.getElementById('answer');
const answerInput = document.getElementById('answerInput');
const check = document.getElementById('check');
const result = document.getElementById('result');
const score = document.getElementById('score');
const continueButton = document.getElementById('continue');

let data = [];
let currentQuestions = [];
let trueRandomSelection = false;

function chooseRandomQuestion() {
    if (currentQuestions.length === 0) {
        alert('No words available. Please select at least one category.');
        return window.currentQuestion;
    }
    let questions = currentQuestions;
    if (questions.length > 1) {
        // do not repeat same question twice
        questions = questions.filter(q => q !== window.currentQuestion);
    }
    if (!trueRandomSelection) {
        // prefer questions never answered correct
        let i = 0;
        while (true) {
            const neverAnsweredCorrectITimes = questions.filter(q => q.correct === i);
            if (neverAnsweredCorrectITimes.length > 0) {
                questions = neverAnsweredCorrectITimes;
                break;
            }
            i++;
        }
    }
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
}

function displayQuestion() {
    window.currentQuestion = chooseRandomQuestion();
    question.textContent = currentQuestion.de;
    answerInput.value = '';
    answerInput.focus();
}

function transformAnswer(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/’/g, "'")
        .replace(/[.!?,]/g, '')
        .replace(/-/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function transformDataAnswer(text) {
    return text
        // remove everything in brackets
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .trim()
        // add word before slash and combined word without slash
        .replace(/(.*[^\s])\/([^\s].*)/g, '$1 / $1$2')
        .replace(/(.+\s)\/(\s.+)/g, '$1/$2/$1, $2/$2, $1')
        .split('/')
        .map(part => transformAnswer(part))
        .filter(part => part !== '')
}

function checkAnswer() {
    console.log(transformDataAnswer(currentQuestion.fr), transformAnswer(answerInput.value));
    if (transformDataAnswer(currentQuestion.fr).includes(transformAnswer(answerInput.value))) {
        result.innerHTML = '<p class="result-notice correct"><span>Correct!</span></p><strong>' + currentQuestion.de + ' = ' + currentQuestion.fr + '</strong>';
        currentQuestion.correct++;
        if (answerInput.value === currentQuestion.fr) {
            updateScore(5);
        } else {
            updateScore(1);
        }
    } else {
        result.innerHTML = '<p class="result-notice incorrect"><span>Incorrect!</span><br>The correct answer is:</p><strong>' + currentQuestion.fr + '</strong>';
        currentQuestion.wrong++;
        updateScore(-1);
    }

    continueButton.style.display = 'block';
    setTimeout(function () {
        continueButton.focus();
    }, 100);
}

function continueGame() {
    result.textContent = '';
    continueButton.style.display = 'none';
    displayQuestion();
}

function renderScore() {
    const scoreValue = localStorage.getItem('score') || 0;
    score.textContent = `Score: ${scoreValue}`;
}

function updateScore(delta) {
    const scoreValue = parseInt(localStorage.getItem('score')) || 0;
    localStorage.setItem('score', scoreValue + delta);
    renderScore();
}

check.addEventListener('click', checkAnswer);
answerInput.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        checkAnswer();
    }
});

continueButton.addEventListener('click', continueGame);

// disable suggestions 
answerInput.setAttribute('autocomplete', 'off');

async function setup() {
    data = await (await fetch('data/words.csv')).text();
    // Parse CSV data
    const rows = data.split('\n');
    const delimiter = rows[0].includes(';') ? ';' : ',';
    const headers = rows[0].split(delimiter);
    // remove linebreaks before lines with no delimeters
    rows.forEach(function (row, index) {
        if (row.split(delimiter).length === 1 && index > 0) {
            rows[index - 1] += ' ' + row;
            rows[index] = '';
        }
    });
    data = rows
        .slice(1) // Skip the header row
        .filter(row => row.trim() !== '') // Filter out empty rows
        .map(function (row) {
            const values = row.split(delimiter);
            if (values.length !== headers.length) {
                console.error('Row length does not match header length:', row);
                return null; // Skip this row
            }
            return headers.reduce(function (acc, header, index) {
                acc[header.trim()] = values[index].trim();
                return acc;
            }, {});
        }).map(function (item) {
            // bring into DE, FR, Lecon, Unité format
            const newItem = {
                de: item['DEUTSCH'].replace(/"/g, ''),
                fr: item['FRANZÖSISCH'].replace(/"/g, ''),
                unite: Number(item['Unité']),
                lecon: Number(item['Leçon']),
                phonetic: item['PHONETIK'],
                correct: 0, wrong: 0
            };
            if (item['DEUTSCH'] && item['FRANZÖSISCH']) {
                return newItem;
            }
            return null; // Skip this item if it doesn't have both DEUTSCH and FRANZÖSISCH
        }).filter(item => item !== null); // Filter out null items

    const lecons = [...new Set(data.map(item => item.lecon))];

    const leconsSelect = document.getElementById('lecons');
    lecons.forEach(function (lecon) {
        const label = document.createElement('label');
        label.textContent = `Leçon ${lecon}`;
        label.for = lecon;
        const option = document.createElement('input');
        option.type = 'checkbox';
        option.checked = true;
        option.id = lecon;
        option.textContent = lecon;
        leconsSelect.appendChild(label);
        label.prepend(option);

        option.addEventListener('change', function () {
            const selectedLecons = Array.from(leconsSelect.querySelectorAll('input[type="checkbox"]:checked')).map(input => Number(input.id));
            currentQuestions = data.filter(item => selectedLecons.includes(item.lecon));
            if (currentQuestions.length === 0) {
                question.textContent = 'Nothing selected!';
                answerInput.style.display = 'none';
                check.style.display = 'none';
                return;
            } else {
                answerInput.style.display = 'block';
                check.style.display = 'block';
                continueGame();
            }
        });
    });

    const btns = document.createElement('div');
    btns.className = 'btns';

    const selectAll = document.createElement('button');
    selectAll.className = 'selection-btn';
    selectAll.textContent = '✔ Select All';
    selectAll.addEventListener('click', function () {
        leconsSelect.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.checked = true;
        });
        leconsSelect.querySelector('input[type="checkbox"]').dispatchEvent(new Event('change'));
    });
    btns.appendChild(selectAll);

    const deselectAll = document.createElement('button');
    deselectAll.className = 'selection-btn';
    deselectAll.textContent = '✖ Deselect All';
    deselectAll.addEventListener('click', function () {
        leconsSelect.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.checked = false;
        });
        leconsSelect.querySelector('input[type="checkbox"]').dispatchEvent(new Event('change'));
    });
    btns.appendChild(deselectAll);

    leconsSelect.appendChild(btns);

    
    currentQuestions = data;

    renderScore();
    continueGame();
}

document.addEventListener('DOMContentLoaded', setup);