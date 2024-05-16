#include "singly-linked-list.h"
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

bool is_empty(struct singly_linked_list *linked_list) {
    if (linked_list -> head == NULL || linked_list -> pointer < 0) {
        return true;
    } else {
        return false;
    }
}

void print_singly_linked_list(struct singly_linked_list *linked_list) {
    printf("singly-linked-list: ");
    if (is_empty(linked_list)) {
        printf("HEAD -> NULL\n");
        return;
    } else {
        struct singly_linked_list_node *current_node = linked_list -> head;
        printf("HEAD -> ");
        while (current_node != NULL) {
            printf("%d -> ", current_node -> data);
            current_node = current_node -> next;
        }
        printf("NULL\n");
    }
}

void print_singly_linked_list_struct(struct singly_linked_list *linked_list) {
    print_singly_linked_list(linked_list);
    printf("\tpointer: %d\n", linked_list -> pointer);
    printf("\tnumber_of_elements: %d\n", linked_list -> number_of_elements);
    printf("\tused memory: %lu bytes\n", (linked_list -> number_of_elements * sizeof(struct singly_linked_list_node)));
}

struct singly_linked_list * initialize_singly_linked_list() {
    printf("\ninitialize_singly_linked_list() called -->\n");
    struct singly_linked_list_node *head = (struct singly_linked_list_node *) malloc(sizeof(struct singly_linked_list_node));
    if (head == NULL) {
        printf("--<ERROR>-- memory allocation failure for head node.\n");
        return NULL;
    }
    struct singly_linked_list *singly_linked_list_struct = (struct singly_linked_list *) malloc(sizeof(struct singly_linked_list));
    if (singly_linked_list_struct == NULL) {
        printf("--<ERROR>-- memory allocation failure for singly linked-list struct.\n");
        return NULL;
    }
    singly_linked_list_struct -> head = head;
    singly_linked_list_struct -> pointer = -1;
    singly_linked_list_struct -> number_of_elements = 0;
    
    printf("\tsingly linked-list successfully initialized!\n");

    print_singly_linked_list_struct(singly_linked_list_struct);

    return singly_linked_list_struct;
}

struct singly_linked_list * insert_head(struct singly_linked_list *linked_list, int data) {
    printf("\ninsert_head(%d) called -->\n", data);
    if (linked_list -> pointer == -1) {
        linked_list -> head -> data = data;
        linked_list -> head -> next = NULL;
        linked_list -> pointer++;
        linked_list -> number_of_elements++;
    } else {
        struct singly_linked_list_node *new_head = (struct singly_linked_list_node *) malloc(sizeof(struct singly_linked_list_node));
        new_head -> data = data;
        new_head -> next = linked_list -> head;
        linked_list -> head = new_head;
        linked_list -> pointer++;
        linked_list -> number_of_elements++;
    }
    print_singly_linked_list_struct(linked_list);
    
    return linked_list;
}

struct singly_linked_list * remove_head(struct singly_linked_list *linked_list) {
    printf("\nremove_head() called -->\n");
    if (is_empty(linked_list)) {
        printf("--<ERROR>-- cannot remove from empty/null linked-list.\n");
        return linked_list;
    }
    printf("\tremoving element %d.\n", linked_list -> head -> data);
    if (linked_list -> pointer == 0) {
        linked_list -> head -> data = 0;
        linked_list -> head -> next = NULL;
        linked_list -> pointer--;
        linked_list -> number_of_elements--;
        linked_list -> head = NULL;
    } else {
        linked_list -> head = linked_list -> head -> next;
        linked_list -> pointer--;
        linked_list -> number_of_elements--;
    }
    
    print_singly_linked_list_struct(linked_list);

    return linked_list;
}

struct singly_linked_list * insert_tail(struct singly_linked_list *linked_list, int data) {
    printf("\ninsert_tail(%d) called -->\n", data);
    if (linked_list -> pointer == -1) {
        linked_list -> head -> data = data;
        linked_list -> head -> next = NULL;
        linked_list -> pointer++;
        linked_list -> number_of_elements++;
    } else {
        struct singly_linked_list_node *new_node = (struct singly_linked_list_node *) malloc(sizeof(struct singly_linked_list_node));
        new_node -> data = data;
        struct singly_linked_list_node *current_node = linked_list -> head;
        while (current_node != NULL) {
            if (current_node -> next == NULL) {
                break;
            }
            current_node = current_node -> next;
        }
        current_node -> next = new_node;
        linked_list -> pointer++;
        linked_list -> number_of_elements++;
    }

    print_singly_linked_list_struct(linked_list);

    return linked_list;
}

struct singly_linked_list * remove_tail(struct singly_linked_list *linked_list) {
    printf("\nremove_tail() called -->\n");
    if (is_empty(linked_list)) {
        printf("--<ERROR>-- cannot remove from empty/null linked-list.\n");
        print_singly_linked_list_struct(linked_list);
        return linked_list;
    }
    if (linked_list -> pointer == 0) {
        printf("\tremoving element %d.\n", linked_list -> head -> data);
        linked_list -> head -> data = 0;
        linked_list -> head -> next = NULL;
        linked_list -> pointer--;
        linked_list -> number_of_elements--;
        linked_list -> head = NULL;
    } else {
        struct singly_linked_list_node *current_node = linked_list -> head;
        while (current_node != NULL) {
            if (current_node -> next -> next == NULL) {
                break;
            }
            current_node = current_node -> next;
        }
        printf("\tremoving element %d.\n", current_node -> next -> data);
        current_node -> next = NULL;
        linked_list -> pointer--;
        linked_list -> number_of_elements--;
    }

    print_singly_linked_list_struct(linked_list);
    
    return linked_list;
}