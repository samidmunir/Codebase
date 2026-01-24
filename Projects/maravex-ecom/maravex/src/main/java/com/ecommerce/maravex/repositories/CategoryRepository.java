package com.ecommerce.maravex.repositories;

import org.springframework.data.jpa.repository.JpaRepository;

import com.ecommerce.maravex.models.Category;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    Category findByCategoryName(String categoryName);
}