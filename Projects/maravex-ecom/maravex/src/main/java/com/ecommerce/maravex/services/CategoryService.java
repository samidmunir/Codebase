package com.ecommerce.maravex.services;

import java.util.List;

import com.ecommerce.maravex.models.Category;

public interface CategoryService {
    List<Category> getAllCategories();

    void createCategory(Category category);

    String deleteCategory(Long categoryId);

    Category updateCategory(Category category, Long categoryId);
}