import torch
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

print("Welcome to PyTorch with Python!")
print(f"\tPyTorch: [{torch.__version__}]")

"""
    Introduction to Tensors
    - main building blocks of deep learning.
    - multi-dimensional numerical data.

    PyTorch tensors are created using torch.tensor() instruction.
"""

# Scalar (Tensor)
scalar = torch.tensor(7)
print(f"\nscalar (tensor): {scalar}")
print(f"type(scalar): {type(scalar)}")
print(f"scalar.ndim: {scalar.ndim}")
print(f"scalar.item(): {scalar.item()}")

# Vector (Tensor)
vector = torch.tensor([7, 7])
print(f"\nvector (tensor): {vector}")
print(f"type(vector): {type(vector)}")
print(f"vector.ndim: {vector.ndim}")
print(f"vector.shape: {vector.shape}")

# Matrix (Tensor)
MATRIX = torch.tensor([[7, 8], [9, 10]])
print(f"\nMATRIX (tensor): {MATRIX}")
print(f"type(MATRIX): {type(MATRIX)}")
print(f"MATRIX.ndim: {MATRIX.ndim}")
print(f"MATRIX.shape: {MATRIX.shape}")
print(f"MATRIX[0]: {MATRIX[0]}")
print(f"MATRIX[1]: {MATRIX[1]}")

TENSOR = torch.tensor([[[1, 2, 3], [4, 5, 6], [7, 8, 9]]])
print(f"\nTENSOR (tensor): {TENSOR}")
print(f"type(TENSOR): {type(TENSOR)}")
print(f"TENSOR.ndim: {TENSOR.ndim}")
print(f"TENSOR.shape: {TENSOR.shape}")
print(f"TENSOR[0]: {TENSOR[0]}")

"""
    Random Tensors
    - they are important because the way many neural networks learn is that they start with tensors full of random numbers and then adjust those random numbers to better represent the data.
        1. start with random numbers
        2. look at data
        3. update random numbers
        4. repeat from #2
"""
random_tensor = torch.rand(3, 4)
print(f"\nrandom_tensor (tensor): {random_tensor}")
print(f"type(random_tensor): {type(random_tensor)}")
print(f"random_tensor.ndim: {random_tensor.ndim}")
print(f"random_tensor.shape: {random_tensor.shape}")
print(f"random_tensor[0]: {random_tensor[0]}")

# Create a random tensor with similar shape to an image tensor
random_image_size_tensor = torch.rand(size = (224, 224, 3)) # height, width, color channel
print(f"\nrandom_image_size_tensor (tensor): {random_image_size_tensor}")
print(f"type(random_image_size_tensor): {type(random_image_size_tensor)}")
print(f"random_image_size_tensor.ndim: {random_image_size_tensor.ndim}")
print(f"random_image_size_tensor.shape: {random_image_size_tensor.shape}")
print(f"random_image_size_tensor[0]: {random_image_size_tensor[0]}")

# Zeros and Ones
zeros = torch.zeros(size = (3, 4))
print(f"\nzeros (tensor): {zeros}")
print(f"type(zeros): {type(zeros)}")
print(f"zeros.ndim: {zeros.ndim}")
print(f"zeros.shape: {zeros.shape}")
print(f"zeros[0]: {zeros[0]}")

ones = torch.ones(size = (3, 4))
print(f"\nones (tensor): {ones}")
print(f"type(ones): {type(ones)}")
print(f"ones.ndim: {ones.ndim}")
print(f"ones.shape: {ones.shape}")
print(f"ones[0]: {ones[0]}")

print(f"\nones.dtype: {ones.dtype}")

"""
    Creating a range of tensors and tensors-like:
"""
print(f"\ntorch.range(0, 10): {torch.range(0, 10)}")