const testFolder = './tests/';
const fs = require('fs');

const tests = fs.readdirSync(testFolder);
const wavFiles = tests.map((test) => {
    return `${test.replace('.rttm', '')}.wav`
})

console.log(wavFiles);