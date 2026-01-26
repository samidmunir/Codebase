package com.ecommerce.maravex.services;

import com.ecommerce.maravex.models.Category;
import com.ecommerce.maravex.payload.CategoryDTO;
import com.ecommerce.maravex.payload.CategoryResponse;

public interface CategoryService {
    CategoryResponse getAllCategories();

    CategoryDTO createCategory(CategoryDTO categoryDTO);

    String deleteCategory(Long categoryId);

    Category updateCategory(Category category, Long categoryId);
}