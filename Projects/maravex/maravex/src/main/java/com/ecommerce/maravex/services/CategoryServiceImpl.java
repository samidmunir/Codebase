package com.ecommerce.maravex.services;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;

import com.ecommerce.maravex.models.Category;

@Service
public class CategoryServiceImpl implements CategoryService {
    private List<Category> categories = new ArrayList<>();

    private Long nextId = 1L;

    @Override
    public List<Category> getAllCategories() {
        return categories;
    }

    @Override
    public void createCategory(Category category) {
        category.setCategoryId(nextId++);
        categories.add(category);
    }
}