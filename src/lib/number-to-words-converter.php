<?php

if (!function_exists('_convertLessThanOneThousand')) {
    /**
     * Helper function to convert a number less than 1000 into words.
     * This is for internal use by numberToWords.
     */
    function _convertLessThanOneThousand($num) {
        $ones = array('', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen');
        $tens = array('', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety');

        if ($num == 0) {
            return '';
        }

        $words = '';

        if ($num >= 100) {
            $words .= $ones[floor($num / 100)] . ' hundred';
            $num %= 100;
            if ($num > 0) {
                $words .= ' and ';
            }
        }

        if ($num > 0) {
            if ($num < 20) {
                $words .= $ones[$num];
            } else {
                $words .= $tens[floor($num / 10)];
                if ($num % 10 > 0) {
                    $words .= '-' . $ones[$num % 10];
                }
            }
        }

        return $words;
    }
}

if (!function_exists('numberToWords')) {
    /**
     * Converts a number into its word representation.
     * e.g., 1234 -> "One Thousand, Two Hundred And Thirty-four"
     */
    function numberToWords($num) {
        if (!is_numeric($num)) {
            return 'Not a number';
        }

        $scales = array('', 'thousand', 'million', 'billion', 'trillion');

        if ($num == 0) {
            return 'Zero';
        }
        
        if ($num < 0) {
            return 'Negative ' . numberToWords(abs($num));
        }

        $integerPart = floor($num);
        $words = '';
        $scaleIndex = 0;
        
        if ($integerPart == 0) {
            return 'Zero';
        } 
        
        while ($integerPart > 0) {
            if ($integerPart % 1000 != 0) {
                $chunkWords = _convertLessThanOneThousand($integerPart % 1000);
                $scaleWord = $scales[$scaleIndex] ? ' ' . $scales[$scaleIndex] : '';
                $separator = $words ? ', ' : '';
                $words = $chunkWords . $scaleWord . $separator . $words;
            }
            $integerPart = floor($integerPart / 1000);
            $scaleIndex++;
        }
        
        // Capitalize the first letter of each word.
        return ucwords(trim($words));
    }
}

?>
