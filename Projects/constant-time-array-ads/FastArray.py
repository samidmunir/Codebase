import random

class FastArray:
    def __init__(self):
        self.values = []
        self.map = {}
    
    def insert(self, value):
        if value in self.map:
            return
        self.values.append(value)
        self.map[value] = len(self.values) - 1
    
    def remove(self, value):
        if value not in self.map:
            return
        index = self.map[value]
        last_value = self.values[-1]
        self.values[-1] = value
        self.map[last_value] = index
        self.values.pop()
        del self.map[value]

    def get_random(self):
        return random.choice(self.values)