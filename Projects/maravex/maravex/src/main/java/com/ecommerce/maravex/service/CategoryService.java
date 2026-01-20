package com.ecommerce.maravex.service;

import java.util.List;

import com.ecommerce.maravex.model.Category;

public interface CategoryService {
    List<Category> getAllCategories();

    void createCategory(Category category);
}