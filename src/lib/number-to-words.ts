'use client';

const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const scales = ['', 'thousand', 'million', 'billion', 'trillion'];

function convertLessThanOneThousand(num: number): string {
    if (num === 0) {
        return '';
    }

    let current = '';

    if (num >= 100) {
        current += ones[Math.floor(num / 100)] + ' hundred';
        num %= 100;
        if (num > 0) {
            current += ' and ';
        }
    }

    if (num > 0) {
        if (num < 20) {
            current += ones[num];
        } else {
            current += tens[Math.floor(num / 10)];
            if (num % 10 > 0) {
                current += '-' + ones[num % 10];
            }
        }
    }

    return current;
}

export function numberToWords(num: number): string {
    if (num === 0) {
        return 'Zero Only';
    }

    const integerPart = Math.floor(num);
    
    if (integerPart === 0) {
        return 'Zero Only';
    }
    
    let words = '';
    let scaleIndex = 0;
    let tempNum = integerPart;

    while (tempNum > 0) {
        if (tempNum % 1000 !== 0) {
            const chunkWords = convertLessThanOneThousand(tempNum % 1000);
            words = chunkWords + (scales[scaleIndex] ? ' ' + scales[scaleIndex] : '') + (words ? ', ' + words : '');
        }
        tempNum = Math.floor(tempNum / 1000);
        scaleIndex++;
    }
    
    const finalWords = words.trim().split(' ').map((word) => {
        if (word.toLowerCase() === 'and') {
            return 'and';
        }
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');

    return `${finalWords} Only`;
}
