package com.ecommerce.maravex.services;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ecommerce.maravex.exceptions.APIException;
import com.ecommerce.maravex.exceptions.ResourceNotFoundException;
import com.ecommerce.maravex.models.Category;
import com.ecommerce.maravex.payload.CategoryResponse;
import com.ecommerce.maravex.repositories.CategoryRepository;

@Service
public class CategoryServiceImpl implements CategoryService {
    @Autowired
    private CategoryRepository categoryRepository;

    @Override
    public CategoryResponse getAllCategories() {
        List<Category> categories = this.categoryRepository.findAll();
        if (categories.isEmpty()) {
            throw new APIException("No category created until now.");
        }
        
        return categories;
    }

    @Override
    public void createCategory(Category category) {
        Category savedCategory = this.categoryRepository.findByCategoryName(category.getCategoryName());
        this.categoryRepository.save(category);
        if (savedCategory != null) {
            throw new APIException("Category with the name " + category.getCategoryName() + " already exists.");
        }
    }

    @Override
    public String deleteCategory(Long categoryId) {
        Category category = this.categoryRepository.findById(categoryId)
            .orElseThrow(() -> new ResourceNotFoundException("Category", "categoryId", categoryId));

        this.categoryRepository.delete(category);
        
        return "Category with categoryId: " + categoryId + " deleted successfully!";
    }

    @Override
    public Category updateCategory(Category category, Long categoryId) {
        Category savedCategory = this.categoryRepository.findById(categoryId)
            .orElseThrow(() -> new ResourceNotFoundException("Category", "categoryId", categoryId));

        category.setCategoryId(categoryId);
        savedCategory = this.categoryRepository.save(category);

        return savedCategory;
    }
}