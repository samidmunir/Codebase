/*
    Sami Munir
    Data Structures & Algorithms
    Singly Linked-list | C implementation
    - main.c
    - singly_linked_list.h
    - singly_linked_list.c
*/

#include "singly-linked-list.h"
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char* argv[]) {
    printf("\nsingly linked-list | implementation in C\n");
    printf("----------------------------------------\n");

    /*
        Testing function initialize_singly_linked_list()
    */
    struct singly_linked_list *linked_list = initialize_singly_linked_list();

    /*
        Testing function insert_head()
    */
    linked_list = insert_head(linked_list, 2);
    linked_list = insert_head(linked_list, 7);
    linked_list = insert_head(linked_list, 11);
    
    return EXIT_SUCCESS;
}