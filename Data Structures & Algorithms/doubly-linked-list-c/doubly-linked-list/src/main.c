/*
    Sami Munir
    Data Structures & Algorithms
    Singly Linked-list | C implementation
    - main.c
    - doubly_linked_list.h
    - doubly_linked_list.c
*/

#include "doubly-linked-list.h"
#include <stdio.h>
#include <stdlib.h>

int main(int argc, char* argv[]) {
    printf("\ndoubly linked-list | implementation in C\n");
    printf("----------------------------------------\n");

    /*
        Testing function initialize_doubly_linked_list()
    */
    struct doubly_linked_list *linked_list  = initialize_doubly_linked_list();

    /*
        Testing function insert_head()
    */
    linked_list = insert_head(linked_list, 2);
    linked_list = insert_head(linked_list, 7);
    linked_list = insert_head(linked_list, 11);
    linked_list = insert_head(linked_list, 56);

    return EXIT_SUCCESS;
}