package com.ecommerce.maravex.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import com.ecommerce.maravex.models.Category;
import com.ecommerce.maravex.services.CategoryService;

import jakarta.validation.Valid;

@RestController
public class CategoryController {
    @Autowired
    private CategoryService categoryService;

    @GetMapping("/api/public/categories")
    public ResponseEntity<List<Category>> getAllCategories() {
        List<Category> categories = this.categoryService.getAllCategories();

        return new ResponseEntity<>(categories, HttpStatus.OK);
    }

    @PostMapping("/api/public/categories")
    public ResponseEntity<String> createCategory(@Valid @RequestBody Category category) {
        this.categoryService.createCategory(category);
        
        return new ResponseEntity<>("Category added successfully.", HttpStatus.CREATED);
    }

    @DeleteMapping("/api/admin/categories/{categoryId}")
    public ResponseEntity<String> deleteCategory(@PathVariable Long categoryId) {
        String status = this.categoryService.deleteCategory(categoryId);

        return new ResponseEntity<>(status, HttpStatus.OK);
    }

    @PutMapping("/api/admin/categories/{categoryId}")
    public ResponseEntity<String> updateCategory(@Valid @RequestBody Category category, @PathVariable Long categoryId) {
        Category savedCategory = this.categoryService.updateCategory(category, categoryId);

        String responseMessage = "Category with categoryId: " + categoryId + "updated successfully.";

        return new ResponseEntity<>(responseMessage, HttpStatus.OK);
    }
}