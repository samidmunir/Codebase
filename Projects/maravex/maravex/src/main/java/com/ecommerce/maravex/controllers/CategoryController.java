package com.ecommerce.maravex.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.ecommerce.maravex.models.Category;
import com.ecommerce.maravex.services.CategoryService;

@RestController
public class CategoryController {
    @Autowired
    private CategoryService categoryService;

    // public CategoryController(CategoryService categoryService) {
    //     this.categoryService = categoryService;
    // }

    @GetMapping("/api/public/categories")
    public List<Category> getAllCategories() {
        return this.categoryService.getAllCategories();
    }

    @PostMapping("/api/public/categories")
    public String createCategory(@RequestBody Category category) {
        this.categoryService.createCategory(category);
        
        return "Category added successfully.";
    }
}