package com.beaconfire.homework.java_calculator_I;

public class Solution {
    public int calculate(int[] input1, String[] input2) {
        int result = 0;
        int current = input1[0];

        for (int i = 0; i < input2.length; i++) {
            String op = input2[i];
            int nextVal = input1[i + 1];

            switch (op) {
                case "mul":
                    current *= nextVal;
                    break;
                
                case "div":
                    current /= nextVal;
                    break;

                case "add":
                    result += current;
                    current = nextVal;
                    break;
                
                case "sub":
                    result += current;
                    current = -nextVal;
                    break;
            }
        }

        result += current;

        return result;
    }
}