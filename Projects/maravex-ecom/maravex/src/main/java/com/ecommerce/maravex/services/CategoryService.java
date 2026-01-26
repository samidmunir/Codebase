package com.ecommerce.maravex.services;

import com.ecommerce.maravex.payload.CategoryDTO;
import com.ecommerce.maravex.payload.CategoryResponse;

public interface CategoryService {
    CategoryResponse getAllCategories();

    CategoryDTO createCategory(CategoryDTO categoryDTO);

    String deleteCategory(Long categoryId);

    CategoryDTO updateCategory(CategoryDTO categoryDTO, Long categoryId);
}