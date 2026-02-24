package com.questions.top_k_frequent_elements;

import java.util.HashMap;
import java.util.Map;
import java.util.PriorityQueue;

/*
    Runtime: 16ms
    Memory: 47.32MB
*/
public class SolutionOne {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> numsMap = new HashMap<>();
        for (int n : nums) {
            numsMap.put(n, numsMap.getOrDefault(n, 0) + 1);
        }

        PriorityQueue<Integer> freqQ = new PriorityQueue<>((a, b) -> Integer.compare(numsMap.get(a), numsMap.get(b)));

        for (int key : numsMap.keySet()) {
            freqQ.offer(key);
            if (freqQ.size() > k) {
                freqQ.poll();
            }
        }

        int[] topK = new int[k];
        for (int i = k - 1; i >= 0; i--) {
            topK[i] = freqQ.poll();
        }

        return topK;
    }
}