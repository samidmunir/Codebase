struct doubly_linked_list_node {
    int data;
    struct doubly_linked_list_node *next;
    struct doubly_linked_list_node *prev;
};

struct doubly_linked_list {
    struct doubly_linked_list_node *head;
    struct doubly_linked_list_node *tail;
    int pointer;
    int number_of_elements;
};