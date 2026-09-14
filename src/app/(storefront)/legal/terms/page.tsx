import type { Metadata } from "next";
import { Section } from "@/components/ui/container";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <Section title="Terms of service">
      <div className="prose mx-auto max-w-2xl text-sm text-gray-700">
        <p className="rounded-control bg-amber-50 p-3 text-xs text-amber-900">
          <strong>Template — not legal advice.</strong> This document was drafted to match Pick Up&apos;s actual
          features (marketplace structure, age-restricted products, scheduled orders, payments, refunds) so it&apos;s
          ready for a lawyer to review, not so it can be treated as final. Have a qualified lawyer licensed in
          Bangladesh review and adapt it — including consumer-protection, e-commerce, and tobacco-control
          requirements — before Pick Up launches to real customers.
        </p>
        <p className="text-xs text-gray-500">Last updated: [insert date on launch] · Effective for users in Khagrachari Sadar, Bangladesh.</p>

        <h2 className="font-heading text-brand-dark">1. Acceptance of these terms</h2>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Pick Up website, mobile
          experience, and related services (together, the &quot;Platform&quot;), operated by Pick Up (&quot;Pick
          Up,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account, browsing the
          Platform, or placing an order, you agree to be bound by these Terms and our{" "}
          <a href="/legal/privacy">Privacy Policy</a>. If you do not agree, do not use the Platform.
        </p>
        <p>
          If you are using the Platform on behalf of a business (for example, as a Vendor or Advertiser), you
          confirm you have authority to bind that business to these Terms, and &quot;you&quot; refers to that
          business as well as you personally.
        </p>

        <h2 className="font-heading text-brand-dark">2. Definitions</h2>
        <ul>
          <li><strong>Customer</strong> — a person who browses or orders products or food through the Platform.</li>
          <li><strong>Vendor</strong> — an independent grocery/essentials shop or restaurant that lists products or menu items for sale through the Platform.</li>
          <li><strong>Rider</strong> — an independent delivery partner who accepts and fulfills deliveries through the Platform.</li>
          <li><strong>Order</strong> — a purchase placed by a Customer, which may be split into one Order per Vendor when a cart contains items from multiple Vendors.</li>
          <li><strong>Content</strong> — product listings, images, descriptions, reviews, and other material submitted to the Platform by Vendors, Riders, Customers, or Advertisers.</li>
        </ul>

        <h2 className="font-heading text-brand-dark">3. The Pick Up marketplace</h2>
        <p>
          Pick Up is a marketplace that connects Customers with independent Vendors and Riders. Except where we
          expressly say otherwise, Pick Up is not the seller of the products or food listed on the Platform, does
          not prepare or manufacture Vendor products, and is not a party to the contract of sale between a Customer
          and a Vendor. Vendors are solely responsible for the accuracy of their listings and the quality, safety,
          legality, and fitness of the products they sell. Riders are independent contractors responsible for safe
          and lawful conduct of deliveries.
        </p>
        <p>
          Pick Up facilitates discovery, ordering, payment collection, and delivery logistics, and may set rules
          (including commission rates, service areas, and content standards) that Vendors and Riders must follow to
          use the Platform.
        </p>

        <h2 className="font-heading text-brand-dark">4. Eligibility and accounts</h2>
        <p>
          You must be at least 18 years old to create an account. You must provide accurate, current information
          when registering and keep it up to date, and you are responsible for all activity under your account and
          for keeping your password confidential. Notify us immediately of any unauthorized use of your account.
        </p>
        <p>
          We may suspend or terminate an account that provides false information, violates these Terms, or is used
          for fraudulent, abusive, or unlawful activity.
        </p>

        <h2 className="font-heading text-brand-dark">5. Products, pricing, and availability</h2>
        <p>
          Prices are shown in Bangladeshi Taka (৳) and are set by each Vendor, plus any delivery fee, applicable
          tax, and platform charges disclosed at checkout. Vendors are responsible for keeping stock levels,
          availability, and product descriptions accurate; Pick Up does not guarantee that a listed product is in
          stock or that photos exactly match what is delivered. We and Vendors may correct pricing or listing
          errors, including after an order is placed, and will notify you if this affects your order.
        </p>

        <h2 className="font-heading text-brand-dark">6. Placing and accepting an order</h2>
        <p>
          Placing an order is an offer to purchase, which the Vendor may accept or decline (for example, if an item
          is unexpectedly out of stock or the Vendor is temporarily too busy to fulfil it on time). A contract of
          sale forms only once the Vendor accepts the order. If a Vendor cannot accept your order, you will be
          notified and any payment already taken for that order will be refunded.
        </p>
        <p>
          A restaurant may ask you to wait briefly for confirmation during high demand rather than declining the
          order outright; in that case your order remains pending until the restaurant confirms or is unable to
          proceed, and you will be shown an estimated wait.
        </p>

        <h2 className="font-heading text-brand-dark">7. Scheduled and weekly grocery orders</h2>
        <p>
          Some grocery items are fulfilled in batches rather than on demand and are clearly marked as such. Orders
          containing these items must be scheduled at least 24 hours in advance instead of our usual fast delivery,
          and the earliest available delivery slot will be enforced at checkout. Restaurant orders may separately
          offer a &quot;schedule for later&quot; option where supported by the restaurant.
        </p>

        <h2 className="font-heading text-brand-dark">8. Delivery</h2>
        <p>
          Estimated delivery times are best-effort estimates, not guarantees, and may vary due to weather, traffic,
          order volume, rider availability, or circumstances beyond our control. Delivery is available only within
          active delivery zones; addresses outside current coverage cannot be served, and you may request coverage
          be extended to your area through the Platform. You are responsible for providing an accurate delivery
          address and being reasonably available to receive the order.
        </p>

        <h2 className="font-heading text-brand-dark">9. Age-restricted products</h2>
        <p>
          Certain products (where legally permitted and enabled on the Platform) are restricted to customers who
          meet the applicable minimum age. For these products: you must confirm you meet the minimum age before
          ordering; delivery may be refused, and the item removed from your order, if our rider is unable to verify
          your age or a valid form of ID at the door; and we do not deliver age-restricted products within
          designated exclusion zones near schools, hospitals, and similar locations. Pick Up may refuse, cancel, or
          reverse such orders at its discretion to comply with the law, and reserves the right to report suspected
          underage purchase attempts as required by law.
        </p>

        <h2 className="font-heading text-brand-dark">10. Payments</h2>
        <p>
          You may pay by cash on delivery or through a supported digital payment method shown at checkout. By
          submitting payment details you confirm you are authorized to use that payment method. Digital payments
          are processed by third-party payment providers under their own terms; Pick Up does not store your full
          payment card or mobile-wallet credentials. All charges are due at the time of order unless cash on
          delivery is selected.
        </p>

        <h2 className="font-heading text-brand-dark">11. Coupons and promotions</h2>
        <p>
          Coupons, discounts, and promotional offers are subject to the specific terms shown at the time of the
          offer (for example, minimum order value, eligible items, or a redemption limit), may be withdrawn or
          modified at any time before use, and have no cash value. We may deny or reverse a discount obtained
          through error, abuse, or violation of these Terms.
        </p>

        <h2 className="font-heading text-brand-dark">12. Cancellations, refunds, and returns</h2>
        <p>
          You may cancel an order free of charge before the Vendor begins preparing it; once preparation has
          started, cancellation may not be possible or may be subject to a charge for work or ingredients already
          committed. If an item is missing, incorrect, damaged, or not as described, contact support within a
          reasonable time of delivery; refund or replacement requests are reviewed case by case and, where
          appropriate, are credited to your original payment method or Pick Up account.
        </p>

        <h2 className="font-heading text-brand-dark">13. Reviews and content you submit</h2>
        <p>
          You may only submit reviews for orders you actually placed, and reviews must be honest, non-defamatory,
          and free of unlawful, abusive, or misleading content. By submitting a review, photo, or other content to
          the Platform, you grant Pick Up a non-exclusive, royalty-free, worldwide licence to display, reproduce,
          and use it in connection with operating and promoting the Platform. We may remove content that violates
          these Terms or applicable law.
        </p>

        <h2 className="font-heading text-brand-dark">14. Vendor terms</h2>
        <p>
          Vendors sell on the Platform under a separate vendor agreement that governs onboarding approval,
          commission rates, payout schedules, product-listing standards, order-acceptance obligations, and grounds
          for suspension. Vendors are independently responsible for food-safety, licensing, tax, and consumer-law
          compliance for everything they sell.
        </p>

        <h2 className="font-heading text-brand-dark">15. Rider terms</h2>
        <p>
          Riders are independent contractors, not employees or agents of Pick Up, and are responsible for
          performing deliveries safely, lawfully, and in accordance with any rider agreement, including rules on
          accepting deliveries, handling age-restricted items, and customer conduct.
        </p>

        <h2 className="font-heading text-brand-dark">16. Advertising on the Platform</h2>
        <p>
          Businesses may purchase advertising placements (such as banners or sponsored listings) shown to
          Customers. Advertised content is provided by the advertiser, marked as &quot;Sponsored&quot; or
          &quot;Advertisement,&quot; and Pick Up does not endorse advertised products or claims. Advertising is
          governed by a separate advertiser agreement covering approval, pricing, and content standards.
        </p>

        <h2 className="font-heading text-brand-dark">17. Prohibited conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>use the Platform for any unlawful purpose or in violation of these Terms;</li>
          <li>attempt to circumvent age-verification, delivery-zone, or exclusion-zone controls;</li>
          <li>submit false, misleading, or fraudulent information, orders, reviews, or payment details;</li>
          <li>interfere with the security or normal operation of the Platform, including by scraping, reverse-engineering, or introducing malicious code;</li>
          <li>harass, threaten, or abuse Vendors, Riders, or Pick Up staff.</li>
        </ul>

        <h2 className="font-heading text-brand-dark">18. Intellectual property</h2>
        <p>
          The Pick Up name, logo, and Platform design are owned by Pick Up and may not be used without our written
          permission. Vendor and Advertiser content remains owned by the party that submitted it, subject to the
          licence granted to Pick Up to display and operate it on the Platform.
        </p>

        <h2 className="font-heading text-brand-dark">19. Disclaimers and limitation of liability</h2>
        <p>
          The Platform is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent permitted
          by law, Pick Up disclaims all warranties regarding the Platform and the products or services offered
          through it, and is not liable for indirect, incidental, or consequential loss arising from your use of
          the Platform, delays or failures in delivery, or the acts or omissions of independent Vendors or Riders.
          Nothing in these Terms limits liability that cannot be limited under applicable law, including for death,
          personal injury, or fraud.
        </p>

        <h2 className="font-heading text-brand-dark">20. Indemnification</h2>
        <p>
          You agree to indemnify and hold Pick Up harmless from claims, losses, and expenses (including reasonable
          legal fees) arising from your breach of these Terms, misuse of the Platform, or violation of applicable
          law.
        </p>

        <h2 className="font-heading text-brand-dark">21. Governing law and disputes</h2>
        <p>
          These Terms are governed by the laws of Bangladesh. Any dispute arising from these Terms or your use of
          the Platform will first be addressed through Pick Up customer support; if unresolved, disputes are
          subject to the exclusive jurisdiction of the courts of Bangladesh, without prejudice to any right you
          have under mandatory consumer-protection law.
        </p>

        <h2 className="font-heading text-brand-dark">22. Changes to these terms</h2>
        <p>
          We may update these Terms from time to time to reflect changes to the Platform or applicable law. We will
          post the updated Terms with a new &quot;last updated&quot; date, and material changes will be highlighted
          on the Platform. Continued use of Pick Up after changes take effect means you accept the updated Terms.
        </p>

        <h2 className="font-heading text-brand-dark">23. Contact us</h2>
        <p>Questions about these Terms can be sent through the Support page, or to the contact details listed in our footer.</p>
      </div>
    </Section>
  );
}
