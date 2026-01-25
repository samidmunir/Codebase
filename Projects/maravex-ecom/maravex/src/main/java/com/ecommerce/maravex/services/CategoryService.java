package com.ecommerce.maravex.services;

import java.util.List;

import com.ecommerce.maravex.models.Category;
import com.ecommerce.maravex.payload.CategoryResponse;

public interface CategoryService {
    CategoryResponse getAllCategories();

    void createCategory(Category category);

    String deleteCategory(Long categoryId);

    Category updateCategory(Category category, Long categoryId);
}