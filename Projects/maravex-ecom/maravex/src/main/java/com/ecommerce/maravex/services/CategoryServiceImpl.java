package com.ecommerce.maravex.services;

import java.util.List;

import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ecommerce.maravex.exceptions.APIException;
import com.ecommerce.maravex.exceptions.ResourceNotFoundException;
import com.ecommerce.maravex.models.Category;
import com.ecommerce.maravex.payload.CategoryDTO;
import com.ecommerce.maravex.payload.CategoryResponse;
import com.ecommerce.maravex.repositories.CategoryRepository;

@Service
public class CategoryServiceImpl implements CategoryService {
    
    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Override
    public CategoryResponse getAllCategories() {
        List<Category> categories = this.categoryRepository.findAll();
        if (categories.isEmpty()) {
            throw new APIException("No category created until now.");
        }

        List<CategoryDTO> categoryDTOs = categories
            .stream()
            .map(category -> modelMapper.map(category, CategoryDTO.class))
            .toList();

        CategoryResponse categoryResponse = new CategoryResponse();
        categoryResponse.setContent(categoryDTOs);
        
        return categoryResponse;
    }

    @Override
    public CategoryDTO createCategory(CategoryDTO categorDTO) {
        Category category = modelMapper.map(categorDTO, Category.class);

        Category categoryDB = this.categoryRepository.findByCategoryName(category.getCategoryName());
        if (categoryDB != null) {
            throw new APIException("Category with the name " + category.getCategoryName() + " already exists.");
        }
        Category savedCategory = this.categoryRepository.save(category);

        CategoryDTO savedCategoryDTO = modelMapper.map(savedCategory, CategoryDTO.class);

        return savedCategoryDTO;
    }

    @Override
    public String deleteCategory(Long categoryId) {
        Category category = this.categoryRepository.findById(categoryId)
            .orElseThrow(() -> new ResourceNotFoundException("Category", "categoryId", categoryId));

        this.categoryRepository.delete(category);
        
        return "Category with categoryId: " + categoryId + " deleted successfully!";
    }

    @Override
    public CategoryDTO updateCategory(CategoryDTO categoryDTO, Long categoryId) {
        Category savedCategory = this.categoryRepository.findById(categoryId)
            .orElseThrow(() -> new ResourceNotFoundException("Category", "categoryId", categoryId));

        Category category = modelMapper.map(categoryDTO, Category.class);

        category.setCategoryId(categoryId);
        savedCategory = this.categoryRepository.save(category);

        return modelMapper.map(savedCategory, CategoryDTO.class);
    }
}