package questions.largest_number_occurence;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Scanner;

public class Solution {
    public void computeLargestNumberAndOccurrence() {
        ArrayList<Integer> nums = new ArrayList<>();
        Scanner numsScanner = new Scanner(System.in);

        System.out.print("Please enter your numbers: ");
        int val = numsScanner.nextInt();
        if (val != 0) {
            nums.add(val);
        }

        while (val != 0) {
            val = numsScanner.nextInt();
            nums.add(val);
        }
        System.out.println("You entered: " + Arrays.toString(nums.toArray()));

        int maxVal = Integer.MIN_VALUE;
        Object[] numsArray = nums.toArray();
        HashMap<Integer, Integer> freqMap = new HashMap<>();

        for (Object o : numsArray) {
            if (freqMap.containsKey((int) o)) {
                int freq = freqMap.get((int) o) + 1;
                freqMap.replace((int) o, freq);
            } else {
                freqMap.put((int) o, 1);
            }
            if ((int) o > maxVal) {
                maxVal = (int) o;
            }
        }

        System.out.println("The largest number is " + maxVal);
        System.out.println("The occurrence count of the largest number is " + freqMap.get(maxVal));
    }
}