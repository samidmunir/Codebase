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